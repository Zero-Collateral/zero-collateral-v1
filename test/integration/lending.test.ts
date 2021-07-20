import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { BigNumber, Signer } from 'ethers'
import hre from 'hardhat'

import { getMarkets } from '../../config'
import { Market } from '../../types/custom/config-types'
import { ERC20, ITellerDiamond, ITToken } from '../../types/typechain'
import { RUN_EXISTING } from '../helpers/env-helpers'
import { fundLender, getFunds } from '../helpers/get-funds'
import { getLPHelpers } from '../helpers/lending-pool'

chai.should()
chai.use(solidity)

const {
  contracts,
  tokens,
  deployments,
  getNamedSigner,
  ethers,
  network,
  evm,
  toBN,
} = hre

describe.skip('Lending', () => {
  // Run tests for all markets
  getMarkets(network).forEach(testLP)

  function testLP(market: Market): void {
    let diamond: ITellerDiamond
    let lendingToken: ERC20
    let tToken: ITToken

    let deployer: Signer
    let lender: Signer
    let lender2: Signer

    before(async () => {
      // Get a fresh market
      await deployments.fixture('markets', {
        keepExistingDeployments: RUN_EXISTING,
      })

      diamond = await contracts.get('TellerDiamond')
      lendingToken = await tokens.get(market.lendingToken)
      tToken = await contracts.get('ITToken', {
        at: await diamond.getTTokenFor(lendingToken.address),
      })

      deployer = await getNamedSigner('deployer')
      lender = await getNamedSigner('lender')
      lender2 = await getNamedSigner('lender2')
    })

    describe(`${market.lendingToken} Market`, () => {
      describe('LendingFacet', () => {
        let helpers: ReturnType<typeof getLPHelpers>

        before(async () => {
          helpers = getLPHelpers(hre, {
            diamond,
            lendingToken,
            tToken,
            amount: null,
          })
        })

        describe('deposit', () => {
          it('should NOT be able deposit directly on the Teller Token contract', async () => {
            await tToken.connect(deployer).restrict(true)

            const depositAmount = await fundLender({
              token: lendingToken,
              amount: 1,
              hre,
            })
            await tToken
              .connect(lender)
              .functions['mint(uint256)'](depositAmount)
              .should.be.revertedWith('Teller: platform restricted')
          })

          it('should NOT be able deposit when lending facet is paused', async () => {
            const LENDING_ID = ethers.utils.id('LENDING')

            // Pause lending
            await diamond
              .connect(deployer)
              .pause(LENDING_ID, true)
              .should.emit(diamond, 'Paused')
              .withArgs(LENDING_ID, await deployer.getAddress())

            // Fund the lender
            const depositAmount = await fundLender({
              token: lendingToken,
              amount: 1,
              hre,
            })

            // Approve amount to loan
            await lendingToken
              .connect(lender)
              .approve(diamond.address, depositAmount)

            // Try deposit into lending pool
            await diamond
              .connect(lender)
              .lendingPoolDeposit(lendingToken.address, depositAmount)
              .should.be.revertedWith('Pausable: paused')

            // Unpause lending
            await diamond
              .connect(deployer)
              .pause(LENDING_ID, false)
              .should.emit(diamond, 'UnPaused')
              .withArgs(LENDING_ID, await deployer.getAddress())
          })

          it.skip('should NOT be able to deposit more than the max TVL setting', async () => {
            const maxTVL = await diamond.getAssetMaxTVL(lendingToken.address)
            const depositAmount = maxTVL.add(1)

            // Fund the lender
            await getFunds({
              to: await lender.getAddress(),
              tokenSym: market.lendingToken,
              amount: depositAmount,
              hre,
            })

            // Approve amount to loan
            await lendingToken
              .connect(lender)
              .approve(diamond.address, depositAmount)

            // Try deposit into lending pool
            await diamond
              .connect(lender)
              .lendingPoolDeposit(lendingToken.address, depositAmount)
              .should.be.revertedWith('Teller: deposit TVL exceeded')
          })

          it('should be able deposit and receive a Teller Token LP balance', async () => {
            const tTokenBalBefore = await tToken.balanceOf(
              await lender.getAddress()
            )
            tTokenBalBefore
              .eq(0)
              .should.eql(
                true,
                'Lender should not have a TToken balance before lending'
              )

            // Fund the market
            const depositAmount = await fundLender({
              token: lendingToken,
              amount: 1,
              hre,
            })

            await helpers.deposit()

            const tTokenBalAfter = await tToken.balanceOf(
              await lender.getAddress()
            )
            tTokenBalAfter
              .eq(depositAmount)
              .should.eql(
                true,
                'Lender TToken balance should equal deposit amount as first lender'
              )
          })
        })
      })

      describe('TToken', () => {
        let depositAmount1: BigNumber
        let depositAmount2: BigNumber

        before(async () => {
          // Get a fresh market
          await deployments.fixture('markets', {
            keepExistingDeployments: RUN_EXISTING,
          })

          // Turn off the Teller Token restriction
          await tToken.connect(deployer).restrict(false)

          // Fund the lender
          depositAmount1 = await fundLender({
            token: lendingToken,
            amount: 10,
            hre,
          })

          // Approve amount to loan
          await lendingToken
            .connect(lender)
            .approve(tToken.address, depositAmount1)
        })

        it(`mint - should be able to deposit ${market.lendingToken} and mint equivalent LP TToken amount as first lender`, async () => {
          const balBefore = await tToken.balanceOf(await lender.getAddress())
          balBefore
            .eq(0)
            .should.eql(
              true,
              'Lender should not have a TToken balance before lending'
            )

          // Deposit tokens and mint TTokens
          await tToken.connect(lender).mint(depositAmount1)

          const balAfter = await tToken.balanceOf(await lender.getAddress())
          balAfter
            .eq(depositAmount1)
            .should.eql(
              true,
              'Lender TToken balance should equal deposit amount as first lender'
            )
        })

        it('rebalance - should use the TTokenStrategy to move funds into another protocol to earn interest', async () => {
          const lendingBalBefore = await lendingToken.balanceOf(tToken.address)
          lendingBalBefore
            .eq(depositAmount1)
            .should.eql(
              true,
              'TToken was not supplied token balance in last test'
            )

          await tToken
            .rebalance()
            .should.emit(
              await contracts.get('ITTokenStrategy', { at: tToken.address }),
              'StrategyRebalanced'
            )
          const lendingBalAfter = await lendingToken.balanceOf(tToken.address)
          lendingBalAfter
            .lt(lendingBalBefore)
            .should.eql(true, 'TToken lending balance not rebalanced')
        })

        it('totalUnderlyingSupply - should return a value that is grater that the initial deposit after 1 block', async () => {
          await evm.advanceBlocks(10)

          const totalUnderlyingSupply =
            await tToken.callStatic.totalUnderlyingSupply()
          totalUnderlyingSupply
            .gt(depositAmount1)
            .should.eql(
              true,
              'TToken strategy did not make any interest on deposit'
            )
        })

        it('exchangeRate - should return a rate that is grater than 1e18 (1-1 default rate)', async () => {
          const exchangeRate = await tToken.callStatic.exchangeRate()
          exchangeRate
            .gt(toBN(1, 18))
            .should.eql(true, 'Exchange rate should be greater than 1-1')
        })

        it('mint, rebalance - should be able to add an additional lender', async () => {
          // Fund the lender
          depositAmount2 = toBN(10, await lendingToken.decimals())
          await getFunds({
            to: await lender2.getAddress(),
            tokenSym: market.lendingToken,
            amount: depositAmount2,
            hre,
          })

          // Approve amount to loan
          await lendingToken
            .connect(lender2)
            .approve(tToken.address, depositAmount2)

          // Deposit tokens and mint TTokens
          await tToken.connect(lender2).mint(depositAmount2)

          // Rebalance funds
          await tToken.connect(deployer).rebalance()

          // Mine blocks to generate interest
          await evm.advanceBlocks(1000)
        })

        it.skip('redeem - should be able to redeem 2nd lender supply for more than deposited', async () => {
          // Redeem lenders balance
          const tSupply = await tToken.balanceOf(await lender2.getAddress())
          await tToken.connect(lender2).redeem(tSupply)

          const balance = await lendingToken.balanceOf(
            await lender2.getAddress()
          )
          balance
            .gt(depositAmount2)
            .should.eql(true, 'Lender lost value from their initial deposit')
        })

        it.skip('redeem - should be able to redeem 1st lender supply for more than deposited', async () => {
          // Redeem lenders balance
          const tSupply = await tToken.balanceOf(await lender.getAddress())
          await tToken.connect(lender).redeem(tSupply)

          const balance = await lendingToken.balanceOf(
            await lender.getAddress()
          )
          balance
            .gt(depositAmount1)
            .should.eql(true, 'Lender lost value from their initial deposit')
        })
      })
    })
  }
})
