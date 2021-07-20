import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { BigNumber } from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Test } from 'mocha'

import { getDappAddresses } from '../../../../config'
import { IAToken, ICErc20, IComptroller, IERC20 } from '../../../../types/typechain'
import { getFunds } from '../../get-funds'
import { LoanHelpersReturn } from '../../loans'
import { TestAction, TestScenario } from '../story-helpers'
import LoanStoryTestDriver from './loan-story-test-driver'
import StoryTestDriver from './story-test-driver'

chai.should()
chai.use(solidity)

/*
We will read state data from the chaindata to determine whether or not each 'action' should pass or fail at the current moment 
Then we will expect that 
*/

export default class DappStoryTestDriver extends StoryTestDriver {
  static generateDomainSpecificTestsForScenario(
    hre: HardhatRuntimeEnvironment,
    scenario: TestScenario,
    parentSuite: Mocha.Suite
  ): Mocha.Suite {
    const scenarioActions = scenario.actions

    for (const action of scenarioActions) {
      const testsForAction: Test[] = DappStoryTestDriver.generateTestsForAction(
        hre,
        action,
        parentSuite
      )
      for (const test of testsForAction) {
        parentSuite.addTest(test)
      }
    }
    return parentSuite
  }

  static generateTestsForAction(
    hre: HardhatRuntimeEnvironment,
    action: TestAction,
    testSuite: Mocha.Suite
  ): Test[] {
    // const _ = testSuite.tests
    const tests: Test[] = []
    const actionParentType = action.actionParentType
    switch (actionParentType) {
      case 'LEND': {
        DappStoryTestDriver.generateTestsForLend(hre, action, tests)
        break
      }
      case 'SWAP': {
        void DappStoryTestDriver.generateTestsForSwap(hre, action, tests)
        break
      }
      case 'CLAIM': {
        void DappStoryTestDriver.generateTestsForClaim(hre, action, tests)
        break
      }
    }

    return tests
  }

  static generateTestsForLend(
    hre: HardhatRuntimeEnvironment,
    action: TestAction,
    tests: Test[]
  ): void {
    const actionType = action.actionType
    const { getNamedSigner, contracts } = hre
    switch (actionType) {
      case 'AAVE': {
        const newTest = new Test('AAVE Lend DAPP', async () => {
          const { getNamedSigner } = hre
          const borrower = await getNamedSigner('borrower')
          const loan = await LoanStoryTestDriver.getLoan(hre, borrower)
          const { details } = loan
          const borrowedAmount = await details.lendingToken.balanceOf(
            details.borrower.address
          )
          let shouldPass = true
          if (!loan) {
            shouldPass = false
          }
          if (borrowedAmount.gt(details.loan.borrowedAmount)) shouldPass = false
          if (shouldPass) {
            await DappStoryTestDriver.lendAave(hre, loan)
          } else {
            await DappStoryTestDriver.lendAave(hre, loan).catch((error) => {
              expect(error).to.exist
            })
          }
        })
        tests.push(newTest)
        break
      }
      case 'YEARN': {
        const newTest = new Test('YEARN Lend DAPP', async () => {
          const { getNamedSigner } = hre
          const borrower = await getNamedSigner('borrower')
          const loan = await LoanStoryTestDriver.getLoan(hre, borrower)
          let shouldPass = true
          if (!loan) {
            shouldPass = false
          }
          if (shouldPass) {
            await DappStoryTestDriver.lendYearn(hre, loan)
          } else {
            await DappStoryTestDriver.lendYearn(hre, loan).catch((error) => {
              expect(error).to.exist
            })
          }
        })
        tests.push(newTest)
        break
      }
      case 'COMPOUND': {
        const newTest = new Test('COMPOUND Lend DAPP', async () => {
          const borrower = await getNamedSigner('borrower')
          const loan = await LoanStoryTestDriver.getLoan(hre, borrower)
          const { details, diamond } = loan

          await getFunds({
            to: await borrower.getAddress(),
            tokenSym: await details.lendingToken.symbol(),
            amount: BigNumber.from(details.loan.borrowedAmount).mul(2),
            hre,
          })
          await details.lendingToken
            .connect(borrower)
            .approve(
              diamond.address,
              BigNumber.from(details.loan.borrowedAmount).mul(2)
            )
          const cToken = await contracts.get<ICErc20>('ICErc20', {
            at: await diamond.getAssetCToken(details.lendingToken.address),
          })
          await diamond
            .connect(details.borrower.signer)
            .compoundLend(
              details.loan.id,
              details.loan.lendingToken,
              details.loan.borrowedAmount
            )
          const escrowAddress = await diamond.getLoanEscrow(details.loan.id)
          const cDaiBalance = await cToken.balanceOf(escrowAddress)
          cDaiBalance.eq(0).should.eql(false, '')

          const tokenAddresses = await diamond.getEscrowTokens(details.loan.id)
          tokenAddresses.should.include(cToken.address)
        })
        tests.push(newTest)
        break
      }
      case 'POOL_TOGETHER': {
        const newTest = new Test('POOL_TOGETHER Lend DAPP', async () => {
          const borrower = await getNamedSigner('borrower')
          const loan = await LoanStoryTestDriver.getLoan(hre, borrower)
          const { details, diamond } = loan
          let shouldPass = true
          const borrowedAmount = (
            await details.lendingToken.balanceOf(
              await diamond.getLoanEscrow(details.loan.id)
            )
          ).toString()
          if (borrowedAmount != details.loan.borrowedAmount.toString())
            shouldPass = false
          if (shouldPass) {
            await DappStoryTestDriver.lendPoolTogether(hre, loan)
          } else {
            await DappStoryTestDriver.lendPoolTogether(hre, loan).catch(
              (error) => {
                expect(error).to.exist
              }
            )
          }
        })
        tests.push(newTest)
        break
      }
      default:
        break
    }
  }

  static async generateTestsForSwap(
    hre: HardhatRuntimeEnvironment,
    action: TestAction,
    tests: Test[]
  ): Promise<void> {
    const { getNamedSigner } = hre
    const dapp = action.actionType
    switch (dapp) {
      case 'UNISWAP': {
        const newTest = new Test('UNISWAP Swap DAPP', async () => {
          const borrower = await getNamedSigner('borrower')
          const loan = await LoanStoryTestDriver.getLoan(hre, borrower)
          const { details, diamond } = loan
          let shouldPass = true
          const escrowAddress = await diamond.getLoanEscrow(details.loan.id)
          const lendingBalBefore = await details.lendingToken.balanceOf(
            escrowAddress
          )

          //read the state and determine if this should pass
          if (!loan) shouldPass = false
          if (lendingBalBefore.lte(0)) shouldPass = false
          if (shouldPass) {
            await DappStoryTestDriver.swapUniSwap(hre, loan)
          } else {
            await DappStoryTestDriver.swapUniSwap(hre, loan).catch((error) => {
              expect(error).to.exist
            })
          }
        })
        tests.push(newTest)
        break
      }
      case 'SUSHISWAP': {
        const newTest = new Test('SUSHISWAP Swap DAPP', async () => {
          const borrower = await getNamedSigner('borrower')
          const loan = await LoanStoryTestDriver.getLoan(hre, borrower)
          let shouldPass = true
          //read the state and determine if this should pass
          if (!loan) shouldPass = false
          const { details, diamond } = loan
          const escrowAddress = await diamond.getLoanEscrow(details.loan.id)
          const lendingBalBefore = await details.lendingToken.balanceOf(
            escrowAddress
          )

          if (lendingBalBefore.lte(0)) shouldPass = false
          if (shouldPass) {
            await DappStoryTestDriver.swapSushiSwap(hre, loan)
          } else {
            await DappStoryTestDriver.swapSushiSwap(hre, loan).catch(
              (error) => {
                expect(error).to.exist
              }
            )
          }
        })
        tests.push(newTest)
        break
      }
      default:
        break
    }
  }

  static async generateTestsForClaim(
    hre: HardhatRuntimeEnvironment,
    action: TestAction,
    tests: Test[]
  ): Promise<void> {
    const { getNamedSigner, contracts, network } = hre
    const dapp = action.actionType
    switch (dapp) {
      case 'COMPOUND': {
        const newTest = new Test('COMPOUND Claim COMP', async () => {
          const borrower = await getNamedSigner('borrower')
          const loan = await LoanStoryTestDriver.getLoan(hre, borrower)
          const { details, diamond } = loan
          let shouldPass = true
          await hre.evm.advanceTime(details.loan.duration)
          const dappAddresses = getDappAddresses(network)
          const Comptroller = await contracts.get<IComptroller>('IComptroller', {
            at: dappAddresses.compoundComptrollerAddress,
          })
          const escrowAddress = await diamond.getLoanEscrow(details.loan.id)
          const compBefore = await Comptroller.compAccrued(escrowAddress)

          //read the state and determine if this should pass
          if (!loan) shouldPass = false
          if (compBefore.lte(0)) shouldPass = false
          if (shouldPass) {
            await DappStoryTestDriver.claimComp(hre, loan)
          } else {
            await DappStoryTestDriver.claimComp(hre, loan).catch((error) => {
              expect(error).to.exist
            })
          }
        })
        tests.push(newTest)
        break
      }
      default:
        break
    }
  }

  static async claimComp(
    hre: HardhatRuntimeEnvironment,
    loan: LoanHelpersReturn
  ): Promise<void> {
    const { contracts, network } = hre
    const { details, diamond } = loan
    const dappAddresses = getDappAddresses(network)
    const Comptroller = await contracts.get<IComptroller>('IComptroller', {
      at: dappAddresses.compoundComptrollerAddress,
    })
    const escrowAddress = await diamond.getLoanEscrow(details.loan.id)
    const compBefore = await Comptroller.compAccrued(escrowAddress)
    await diamond
      .connect(details.borrower.signer)
      .compoundClaimComp(details.loan.id)
    const compafter = await Comptroller.compAccrued(escrowAddress)
    expect(compafter.toString()).to.equal('0')
  }

  static async lendYearn(
    hre: HardhatRuntimeEnvironment,
    loan: LoanHelpersReturn
  ): Promise<void> {
    const { details, diamond } = loan
    await diamond
      .connect(details.borrower.signer)
      .yearnDeposit(
        details.loan.id,
        details.loan.lendingToken,
        details.loan.borrowedAmount
      )

    const escrowAddress = await diamond.getLoanEscrow(details.loan.id)
    const daiBalance = await details.lendingToken.balanceOf(escrowAddress)
    daiBalance.eq(details.loan.borrowedAmount).should.eql(true, '')

    const tokenAddresses = await diamond.getEscrowTokens(details.loan.id)
    // tokenAddresses.should.include(aToken.address)
  }

  static async withdrawYearn(
    hre: HardhatRuntimeEnvironment,
    loan: LoanHelpersReturn
  ): Promise<void> {
    const { contracts } = hre
    const { details, diamond } = loan
    await diamond
      .connect(details.borrower.signer)
      .yearnWithdrawAll(details.loan.id, details.lendingToken.address)

    const escrowAddress = await diamond.getLoanEscrow(details.loan.id)

    const tokenAddresses = await diamond.getEscrowTokens(details.loan.id)
    // tokenAddresses.should.not.include(aToken.address)

    const daiBalance = await details.lendingToken.balanceOf(escrowAddress)
    daiBalance.eq(0).should.eql(true, '')
  }

  static async lendAave(
    hre: HardhatRuntimeEnvironment,
    loan: LoanHelpersReturn
  ): Promise<void> {
    const { contracts } = hre
    const { details, diamond } = loan
    const aToken = await contracts.get<IAToken>('IAToken', {
      at: await diamond.getAssetAToken(details.lendingToken.address),
    })
    await diamond
      .connect(details.borrower.signer)
      .aaveDeposit(
        details.loan.id,
        details.loan.lendingToken,
        details.loan.borrowedAmount
      )

    const escrowAddress = await diamond.getLoanEscrow(details.loan.id)

    const aDaiBalance = await aToken.balanceOf(escrowAddress)

    aDaiBalance.eq(details.loan.borrowedAmount).should.eql(true, '')

    const tokenAddresses = await diamond.getEscrowTokens(details.loan.id)
    tokenAddresses.should.include(aToken.address)
  }

  static async withdrawAave(
    hre: HardhatRuntimeEnvironment,
    loan: LoanHelpersReturn
  ): Promise<void> {
    const { contracts } = hre
    const { details, diamond } = loan
    const aToken = await contracts.get<IAToken>('IAToken', {
      at: await diamond.getAssetAToken(details.lendingToken.address),
    })
    await diamond
      .connect(details.borrower.signer)
      .aaveWithdrawAll(details.loan.id, details.lendingToken.address)

    const escrowAddress = await diamond.getLoanEscrow(details.loan.id)

    const tokenAddresses = await diamond.getEscrowTokens(details.loan.id)
    tokenAddresses.should.not.include(aToken.address)

    const aDaiBalance = await aToken.balanceOf(escrowAddress)
    aDaiBalance.eq(0).should.eql(true, '')
  }

  static async lendPoolTogether(
    hre: HardhatRuntimeEnvironment,
    loan: LoanHelpersReturn
  ): Promise<void> {
    const { contracts } = hre
    const { details, diamond } = loan
    const poolTicket = await contracts.get<IERC20>('IERC20', {
      at: await diamond.getAssetPPoolTicket(details.lendingToken.address),
    })
    await diamond
      .connect(details.borrower.signer)
      .poolTogetherDepositTicket(
        details.loan.id,
        details.loan.lendingToken,
        details.loan.borrowedAmount
      )

    const escrowAddress = await diamond.getLoanEscrow(details.loan.id)

    const daiBalance = await details.lendingToken.balanceOf(escrowAddress)
    daiBalance.eq(details.loan.borrowedAmount).should.eql(false, '')

    const tokenAddresses = await diamond.getEscrowTokens(details.loan.id)
    tokenAddresses.should.include(poolTicket.address)
  }

  static async withdrawPoolTogether(
    hre: HardhatRuntimeEnvironment,
    loan: LoanHelpersReturn
  ): Promise<void> {
    const { contracts } = hre
    const { details, diamond } = loan
    const poolTicket = await contracts.get<IERC20>('IERC20', {
      at: await diamond.getAssetPPoolTicket(details.lendingToken.address),
    })
    await diamond
      .connect(details.borrower.signer)
      .poolTogetherWithdrawAll(details.loan.id, details.lendingToken.address)

    const tokenAddresses = await diamond.getEscrowTokens(details.loan.id)
    tokenAddresses.should.not.include(poolTicket.address)
    const escrowAddress = await diamond.getLoanEscrow(details.loan.id)
    const daiBalance = await details.lendingToken.balanceOf(escrowAddress)
    daiBalance.should.be.gt('0')
  }

  static async swapSushiSwap(
    hre: HardhatRuntimeEnvironment,
    loan: LoanHelpersReturn
  ): Promise<void> {
    const { tokens } = hre
    const { details, diamond } = loan
    const escrowAddress = await diamond.getLoanEscrow(details.loan.id)

    const lendingBalBefore = await details.lendingToken.balanceOf(escrowAddress)
    lendingBalBefore
      .gt(0)
      .should.eql(true, 'Loan escrow should have a lending token balance')
    const link = await tokens.get('LINK')
    const swapBalBefore = await link.balanceOf(escrowAddress)
    swapBalBefore
      .eq(0)
      .should.eql(
        true,
        'Loan escrow should not have a token balance before swap'
      )

    await diamond
      .connect(details.borrower.signer)
      .sushiswapSwap(
        details.loan.id,
        [details.lendingToken.address, link.address],
        lendingBalBefore,
        '0'
      )
      .should.emit(diamond, 'SushiswapSwapped')

    const swapBalAfter = await link.balanceOf(escrowAddress)
    swapBalAfter
      .gt(0)
      .should.eql(true, 'Swap token balance not positive after swap')

    const lendingBalAfter = await details.lendingToken.balanceOf(escrowAddress)
    lendingBalAfter
      .eq(0)
      .should.eql(
        true,
        'Loan escrow has lending token balance after swapping full amount'
      )
  }

  static async swapUniSwap(
    hre: HardhatRuntimeEnvironment,
    loan: LoanHelpersReturn
  ): Promise<void> {
    const { tokens } = hre
    const { details, diamond } = loan
    const link = await tokens.get('LINK')
    const escrowAddress = await diamond.getLoanEscrow(details.loan.id)

    const lendingBalBefore = await details.lendingToken.balanceOf(escrowAddress)
    lendingBalBefore
      .gt(0)
      .should.eql(true, 'Loan escrow should have a lending token balance')

    const swapBalBefore = await link.balanceOf(escrowAddress)
    swapBalBefore
      .eq(0)
      .should.eql(
        true,
        'Loan escrow should not have a token balance before swap'
      )

    await diamond
      .connect(details.borrower.signer)
      .uniswapSwap(
        details.loan.id,
        [details.lendingToken.address, link.address],
        lendingBalBefore,
        '0'
      )
      .should.emit(diamond, 'UniswapSwapped')

    const swapBalAfter = await link.balanceOf(escrowAddress)
    swapBalAfter
      .gt(0)
      .should.eql(true, 'Swap token balance not positive after swap')

    const lendingBalAfter = await details.lendingToken.balanceOf(escrowAddress)
    lendingBalAfter
      .eq(0)
      .should.eql(
        true,
        'Loan escrow has lending token balance after swapping full amount'
      )
  }
}
