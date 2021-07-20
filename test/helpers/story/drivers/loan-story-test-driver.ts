import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { BigNumber, ContractTransaction, Signer } from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Test } from 'mocha'
import moment from 'moment'
import Prando from 'prando'

import { getMarkets } from '../../../../config'
import { getPlatformSetting, updatePlatformSetting } from '../../../../tasks'
import { ITellerDiamond } from '../../../../types/typechain'
import { fundedMarket } from '../../../fixtures'
import { getFunds } from '../../get-funds'
import {
  loanHelpers,
  LoanHelpersReturn,
  LoanType,
  repayLoan,
  RepayLoanArgs,
  takeOutLoanWithNfts,
  takeOutLoanWithoutNfts,
} from '../../loans'
import { TestAction, TestArgs, TestScenario } from '../story-helpers'
import StoryTestDriver from './story-test-driver'
const rng = new Prando('teller')

chai.should()
chai.use(solidity)
/*
We will read state data from the chaindata to determine whether or not each 'action' should pass or fail at the current moment 
Then we will expect that 
*/

export default class LoanStoryTestDriver extends StoryTestDriver {
  static generateDomainSpecificTestsForScenario(
    hre: HardhatRuntimeEnvironment,
    scenario: TestScenario,
    parentSuite: Mocha.Suite
  ): Mocha.Suite {
    const scenarioActions = scenario.actions

    for (const action of scenarioActions) {
      const testsForAction: Test[] = LoanStoryTestDriver.generateTestsForAction(
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
    testSuite.tests
    const tests: Test[] = []
    const { actionType, args } = action
    switch (actionType) {
      case 'TAKE_OUT': {
        const newTest = new Test(action.suiteName, async () => {
          let shouldPass = true
          //read the state and determine if this should pass
          const borrower = await hre.getNamedSigner('borrower')
          const diamond = await hre.contracts.get<ITellerDiamond>(
            'TellerDiamond'
          )
          const allBorrowerLoans = await diamond.getBorrowerLoans(
            await borrower.getAddress()
          )
          if (allBorrowerLoans.length > 1) {
            shouldPass = false
          }
          if (shouldPass) {
            await LoanStoryTestDriver.takeOutLoan(hre, args)
          } else {
            args.loanType = LoanType.OVER_COLLATERALIZED
            await LoanStoryTestDriver.takeOutLoan(hre, args).catch((error) => {
              expect(error).to.exist
            })
          }
        })
        tests.push(newTest)
        break
      }
      case 'REPAY': {
        const newTest = new Test(action.suiteName, async () => {
          const shouldPass = true
          //read the state and determine if this should pass

          if (shouldPass) {
            const tx = await LoanStoryTestDriver.repayLoan(hre)
            expect(tx).to.exist
          } else {
            await expect(await LoanStoryTestDriver.repayLoan(hre)).to.be
              .reverted
          }
        })
        tests.push(newTest)
        break
      }
      case 'LIQUIDATE': {
        const newTest = new Test(action.suiteName, async () => {
          // expect(1).to.equal(1)
          const shouldPass = true
          //read the state and determine if this should pass

          if (shouldPass) {
            const tx = await LoanStoryTestDriver.liquidateLoan(hre)
            expect(tx).to.exist
          } else {
            await expect(await LoanStoryTestDriver.liquidateLoan(hre)).to.be
              .reverted
          }
        })
        tests.push(newTest)
        break
      }
    }
    return tests
  }

  // static createLoanArgs = (
  //   hre: HardhatRuntimeEnvironment,
  //   borrower: string
  // ): CreateLoanArgs => {
  //   const { network } = hre
  //   const markets = getMarkets(network)
  //   const randomMarket = rng.nextInt(0, markets.length - 1)
  //   const market = markets[randomMarket]
  //   const randomCollateralToken = rng.nextInt(
  //     0,
  //     market.collateralTokens.length - 1
  //   )
  //   const randomLoanType = rng.nextInt(
  //     0,
  //     Object.values(LoanType).length / 2 - 1
  //   )
  //   return {
  //     lendToken: market.lendingToken,
  //     collToken: market.collateralTokens[randomCollateralToken],
  //     loanType: randomLoanType,
  //   }
  // }

  static takeOutLoan = async (
    hre: HardhatRuntimeEnvironment,
    args: TestArgs
  ): Promise<ContractTransaction> => {
    const markets = getMarkets(hre.network)
    const market = markets[0]
    switch (process.env.FORKING_NETWORK) {
      case 'mainnet':
      case 'kovan':
      case 'rinkeby':
      case 'ropsten':
        const tags: string[] = []
        tags.push('markets')
        const { deployments } = hre
        await deployments.fixture(tags, {
          keepExistingDeployments: true,
        })
        const percentageSubmission = {
          name: 'RequiredSubmissionsPercentage',
          value: 0,
        }
        await updatePlatformSetting(percentageSubmission, hre)
        break
      case 'polygon':
      case 'polygon_mumbai':
        const { diamond } = await fundedMarket(hre, {
          assetSym: market.lendingToken,
          amount: 100000,
        })
        break
      default:
        throw new Error(
          `Forking network is invalid: ${process.env.FORKING_NETWORK}`
        )
    }
    // Advance time
    const { value: rateLimit } = await getPlatformSetting(
      'RequestLoanTermsRateLimit',
      hre
    )
    const loanType = args.loanType
      ? args.loanType
      : LoanType.UNDER_COLLATERALIZED
    await hre.evm.advanceTime(rateLimit)
    const funcToRun = args.nft
      ? takeOutLoanWithNfts(hre, {
          amount: 100,
          lendToken: market.lendingToken,
        })
      : takeOutLoanWithoutNfts(hre, {
          lendToken: market.lendingToken,
          collToken: market.collateralTokens[0],
          loanType,
        })
    const { tx, getHelpers } = await funcToRun
    const helpers = await getHelpers()
    // borrower data from our helpers
    if (loanType != LoanType.ZERO_COLLATERAL) {
      const { collateral } = helpers
      const amount = await collateral.current()
      // check if collateral is > 0
      amount.gt(0).should.eq(true, 'Loan must have collateral')
    }
    // check if loan exists
    expect(helpers.details.loan).to.exist
    const loanStatus = helpers.details.loan.status
    expect(loanStatus).to.equal(2)
    return await tx
  }

  static getLoan = async (
    hre: HardhatRuntimeEnvironment,
    borrower: Signer
  ): Promise<LoanHelpersReturn> => {
    const diamond = await hre.contracts.get<ITellerDiamond>('TellerDiamond')
    const allBorrowerLoans = await diamond.getBorrowerLoans(
      await borrower.getAddress()
    )
    expect(
      allBorrowerLoans.length,
      'allBorrowerLoans must be greater than 0'
    ).to.be.greaterThan(0)
    if (allBorrowerLoans.length == 0) throw Error('No borrower loans')
    const loanID = allBorrowerLoans[allBorrowerLoans.length - 1].toString()
    return await loanHelpers(hre, loanID)
  }

  static liquidateLoan = async (
    hre: HardhatRuntimeEnvironment
  ): Promise<ContractTransaction> => {
    const borrowerAddress = (await hre.getNamedAccounts()).borrower
    const borrower = await hre.ethers.provider.getSigner(borrowerAddress)
    const loan = await LoanStoryTestDriver.getLoan(hre, borrower)
    const { details, diamond } = loan
    await hre.evm.advanceTime(details.loan.duration + 3600)
    const liquidator = await hre.getNamedSigner('liquidator')
    const borrowedAmount = details.loan.borrowedAmount
    await getFunds({
      to: await liquidator.getAddress(),
      tokenSym: await details.lendingToken.symbol(),
      amount: BigNumber.from(borrowedAmount).mul(2),
      hre,
    })
    await details.lendingToken
      .connect(liquidator)
      .approve(diamond.address, BigNumber.from(borrowedAmount).mul(2))
    const tx = await diamond.connect(liquidator).liquidateLoan(details.loan.id)
    return tx
  }

  static repayLoan = async (
    hre: HardhatRuntimeEnvironment
  ): Promise<ContractTransaction> => {
    const borrower = await hre.getNamedSigner('borrower')
    const loan = await LoanStoryTestDriver.getLoan(hre, borrower)
    const { details, diamond } = loan
    const borrowedAmount = details.loan.borrowedAmount
    const repayLoanArgs: RepayLoanArgs = {
      amount: details.loan.borrowedAmount,
      from: details.borrower.signer,
      diamond,
      details,
    }
    await hre.evm.advanceTime(moment.duration(10, 'minutes'))
    const borrowerAddress = await borrower.getAddress()
    await getFunds({
      to: borrowerAddress,
      tokenSym: await details.lendingToken.symbol(),
      amount: BigNumber.from(borrowedAmount).mul(2),
      hre,
    })
    await details.lendingToken
      .connect(borrower)
      .approve(diamond.address, BigNumber.from(borrowedAmount).mul(2))
    const tx = await repayLoan(repayLoanArgs)
    return tx
  }
}
