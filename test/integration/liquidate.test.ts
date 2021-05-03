import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { BigNumber, BigNumberish, Signer } from 'ethers'
import hre from 'hardhat'
import moment from 'moment'

import { getMarkets } from '../../config'
import { getPlatformSetting } from '../../tasks'
import { Market } from '../../types/custom/config-types'
import { ERC20, ITellerDiamond } from '../../types/typechain'
import { HUNDRED_PERCENT, LoanStatus } from '../../utils/consts'
import { fundedMarket } from '../fixtures'
import { getFunds } from '../helpers/get-funds'
import {
  CreateLoanReturn,
  LoanHelpersReturn,
  LoanType,
  takeOut,
} from '../helpers/loans'

chai.should()
chai.use(solidity)

const { getNamedSigner, evm } = hre

describe('Liquidate Loans', () => {
  getMarkets(hre.network).forEach(testLoans)

  function testLoans(market: Market): void {
    let liquidator: { signer: Signer; address: string }
    let diamond: ITellerDiamond
    let liquidateRewardPercent: BigNumber

    before(async () => {
      // Get funded market
      ;({ diamond } = await fundedMarket({
        assetSym: market.lendingToken,
        amount: 100000,
        tags: ['nft'],
      }))

      const liquidatorSigner = await getNamedSigner('liquidator')
      liquidator = {
        signer: liquidatorSigner,
        address: await liquidatorSigner.getAddress(),
      }
      liquidateRewardPercent = await getPlatformSetting(
        'LiquidateRewardPercent',
        hre
      ).then(({ value }) => value)
    })

    enum LiqLoanStatus {
      Expired,
    }
    interface TestSetupArgs {
      amount?: BigNumberish
      loanType: LoanType
      status: LiqLoanStatus
    }
    const testSetup = async (
      args: TestSetupArgs
    ): Promise<LoanHelpersReturn> => {
      const helpers = await takeOut({
        lendToken: market.lendingToken,
        collToken: market.collateralTokens[0],
        amount: args.amount,
        loanType: args.loanType,
      })
      const { details } = helpers

      // Get required amount of tokens to repay loan
      let neededAmount = details.totalOwed
      const tokenBal = await details.lendingToken.balanceOf(liquidator.address)
      if (tokenBal.lt(neededAmount)) {
        neededAmount = tokenBal.add(neededAmount.sub(tokenBal))
      }

      // Fund lender account
      if (neededAmount.gt(0)) {
        await getFunds({
          to: liquidator.address,
          tokenSym: market.lendingToken,
          amount: neededAmount,
        })
      }
      // Approve the token on the diamond
      await details.lendingToken
        .connect(liquidator.signer)
        .approve(diamond.address, details.totalOwed)

      switch (args.status) {
        case LiqLoanStatus.Expired:
          // Advance time
          await evm.advanceTime(details.loan.duration)
      }

      return helpers
    }

    describe('reward', () => {
      it('should calculate correct liquidation reward for a zero collateral loan', async () => {
        const { details } = await testSetup({
          loanType: LoanType.ZERO_COLLATERAL,
          status: LiqLoanStatus.Expired,
        })

        // Expected reward amount right after taking out loan w/ 0 collateral should be the amount owed
        const expectedReward = await diamond.getLoanEscrowValue(details.loan.id)
        const reward = await diamond.getLiquidationReward(details.loan.id)
        reward.inLending_.should.eql(
          expectedReward,
          'Invalid zero collateral liquidation reward calculated'
        )
      })

      it('should calculate correct liquidation reward for an under collateralized loan', async () => {
        const { details } = await testSetup({
          loanType: LoanType.UNDER_COLLATERALIZED,
          status: LiqLoanStatus.Expired,
        })

        // Get the expected reward amount
        const expectedReward = details.totalOwed.add(
          details.totalOwed.mul(liquidateRewardPercent).div(HUNDRED_PERCENT)
        )
        const reward = await diamond.getLiquidationReward(details.loan.id)
        reward.inLending_.should.eql(
          expectedReward,
          'Invalid under collateralized liquidation reward calculated'
        )
      })

      it('should calculate correct liquidation reward for an over collateralized loan', async () => {
        const { details } = await testSetup({
          loanType: LoanType.OVER_COLLATERALIZED,
          status: LiqLoanStatus.Expired,
        })

        // Get the expected reward amount
        const expectedReward = details.totalOwed.add(
          details.totalOwed.mul(liquidateRewardPercent).div(HUNDRED_PERCENT)
        )
        const reward = await diamond.getLiquidationReward(details.loan.id)
        reward.inLending_.should.eql(
          expectedReward,
          'Invalid over collateralized liquidation reward calculated'
        )
        reward.inLending_
          .gt(details.totalOwed)
          .should.eql(true, 'Reward less than liquidation payment')
      })
    })

    describe('expired', () => {
      it('should be able to liquidate an expired zero collateral loan', async () => {
        const { details } = await testSetup({
          loanType: LoanType.ZERO_COLLATERAL,
          status: LiqLoanStatus.Expired,
        })

        const liquidatorLendBefore = await details.lendingToken.balanceOf(
          liquidator.address
        )
        const liquidatorCollBefore = await details.collateralToken.balanceOf(
          liquidator.address
        )
        const reward = await diamond.getLiquidationReward(details.loan.id)

        await diamond
          .connect(liquidator.signer)
          .liquidateLoan(details.loan.id)
          .should.emit(diamond, 'LoanLiquidated')

        await details
          .refresh()
          .then(({ loan: { status } }) =>
            status.should.eq(LoanStatus.Liquidated, 'Loan not liquidated')
          )

        const liquidatorLendAfter = await details.lendingToken.balanceOf(
          liquidator.address
        )
        const lendDiff = liquidatorLendAfter
          .add(details.totalOwed)
          .sub(liquidatorLendBefore)
        lendDiff.should.eql(
          reward.inLending_,
          'Expected liquidator to be paid by loan escrow in lending token'
        )

        const liquidatorCollAfter = await details.collateralToken.balanceOf(
          liquidator.address
        )
        const collDiff = liquidatorCollAfter.sub(liquidatorCollBefore)
        collDiff
          .eq(0)
          .should.eql(
            true,
            'Liquidator collateral token balance should not increase'
          )
      })

      it('should be able to liquidate an expired under collateralized loan', async () => {
        const { details, collateral } = await testSetup({
          loanType: LoanType.UNDER_COLLATERALIZED,
          status: LiqLoanStatus.Expired,
        })

        const loanCollateral = await collateral.current()
        const liquidatorCollBefore = await details.collateralToken.balanceOf(
          liquidator.address
        )

        await diamond
          .connect(liquidator.signer)
          .liquidateLoan(details.loan.id)
          .should.emit(diamond, 'LoanLiquidated')

        await details
          .refresh()
          .then(({ loan: { status } }) =>
            status.should.eq(LoanStatus.Liquidated, 'Loan not liquidated')
          )

        const liquidatorCollAfter = await details.collateralToken.balanceOf(
          liquidator.address
        )
        const collDiff = liquidatorCollAfter.sub(liquidatorCollBefore)

        collDiff.gt(0).should.eql(true, 'Collateral reward not positive')
        collDiff.should.eql(loanCollateral, 'Incorrect collateral reward paid')
      })

      it('should be able to liquidate an expired over collateralized loan', async () => {
        const { details } = await testSetup({
          loanType: LoanType.OVER_COLLATERALIZED,
          status: LiqLoanStatus.Expired,
        })

        const liquidatorCollBefore = await details.collateralToken.balanceOf(
          liquidator.address
        )
        const reward = await diamond.getLiquidationReward(details.loan.id)

        await diamond
          .connect(liquidator.signer)
          .liquidateLoan(details.loan.id)
          .should.emit(diamond, 'LoanLiquidated')

        await details
          .refresh()
          .then(({ loan: { status } }) =>
            status.should.eq(LoanStatus.Liquidated, 'Loan not liquidated')
          )

        const liquidatorCollAfter = await details.collateralToken.balanceOf(
          liquidator.address
        )
        liquidatorCollAfter
          .sub(liquidatorCollBefore)
          .gt(0)
          .should.eql(true, 'Collateral reward not positive')
        liquidatorCollAfter
          .sub(liquidatorCollBefore)
          .should.eql(reward.inCollateral_, 'Incorrect collateral reward paid')
      })
    })
  }
})
