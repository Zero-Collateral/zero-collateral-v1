import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import hre from 'hardhat'

import { Escrow, ERC20Detailed, UniswapDapp } from '../../types/typechain'
import { BigNumberish, Signer } from 'ethers'
import { getTokens } from '../../config/tokens'
import { Network } from '../../types/custom/config-types'
import { createMarketWithLoan, LoanType } from '../fixtures'

chai.should()
chai.use(solidity)

interface TestSetupReturn {
  escrow: Escrow
  user: Signer
  uniswap: UniswapDapp
  dai: ERC20Detailed
}

const { deployments, contracts, getNamedSigner, ethers, toBN } = hre

const setUpTest = deployments.createFixture(
  async (): Promise<TestSetupReturn> => {
    const user = await getNamedSigner('borrower')
    const market = await createMarketWithLoan({
      market: {
        market: { lendTokenSym: 'DAI', collTokenSym: 'ETH' },
      },
      borrower: user,
      loanType: LoanType.UNDER_COLLATERALIZED,
    })

    const loan = await market.loanManager.loans(market.createdLoanId)

    const escrow = await contracts.get<Escrow>('Escrow', { at: loan.escrow })
    const ting = await escrow.getTokens()

    const dai = await contracts.get<ERC20Detailed>('ERC20Detailed', {
      at: getTokens(<Network>hre.network.name).DAI,
    })
    const uniswap = await contracts.get<UniswapDapp>('UniswapDapp')

    return {
      escrow,
      user,
      uniswap,
      dai,
    }
  }
)

describe('UniswapDapp', async () => {
  let escrow: Escrow
  let user: Signer
  let rando: Signer
  let uniswap: UniswapDapp
  let dai: ERC20Detailed
  let comp: ERC20Detailed
  let tokens: string[]

  beforeEach(async () => {
    // Set up
    ;({ escrow, user, uniswap, dai } = await setUpTest())
    rando = await getNamedSigner('liquidator')

    comp = await contracts.get<ERC20Detailed>('ERC20Detailed', {
      at: getTokens(<Network>hre.network.name).COMP,
    })
  })

  describe('swap', () => {
    it('Should be able to swap using Uniswap', async () => {
      const compBalanceBefore = await comp.balanceOf(escrow.address)
      compBalanceBefore.eq(0).should.be.true

      const daiBalanceBefore = await dai.balanceOf(escrow.address)
      daiBalanceBefore.gt(0).should.be.true

      const uniswap = await contracts.get<UniswapDapp>('UniswapDapp')
      await escrow.connect(user).callDapp({
        location: uniswap.address,
        data: uniswap.interface.encodeFunctionData('swap', [
          [dai.address, getTokens(<Network>hre.network.name).COMP],
          daiBalanceBefore,
          '0',
        ]),
      })

      const compBalanceAfter = await comp.balanceOf(escrow.address)
      compBalanceAfter.gt(0).should.be.true

      const daiBalanceAfter = await dai.balanceOf(escrow.address)
      daiBalanceAfter.eq(0).should.be.true
    })

    it('Should not be able to swap using Uniswap as not the loan borrower', async () => {
      await escrow
        .connect(rando)
        .callDapp({
          location: uniswap.address,
          data: uniswap.interface.encodeFunctionData('swap', [
            [dai.address, getTokens(<Network>hre.network.name).COMP],
            '10000000',
            '0',
          ]),
        })
        .should.rejectedWith('NOT_BORROWER')
    })
  })
})
