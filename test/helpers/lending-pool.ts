import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { BigNumber, Signer } from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { ERC20, ITellerDiamond, ITToken } from '../../types/typechain'

chai.use(solidity)

export interface LPHelperArgs {
  diamond: ITellerDiamond
  lendingToken: ERC20
  tToken: ITToken
  amount: BigNumber | null
}

export interface LPHelpersReturn {
  deposit: ReturnType<typeof depositWithArgs>,
  withdraw: ReturnType<typeof withdrawWithArgs>,
}

/**
 * Creates all LP test helper functions.
 * @param hre {HardhatRuntimeEnvironment}
 * @param args {LPHelperArgs}
 */
export const getLPHelpers = (
  hre: HardhatRuntimeEnvironment,
  args: LPHelperArgs
): LPHelpersReturn => ({
  deposit: depositWithArgs(hre, args),
  withdraw: withdrawWithArgs(hre, args),
  // createLoan: creatLoanWithArgs(args),
  // repay: repayWithArgs(args),
})

/**
 * Factory function to create a test LP helper to easily deposit and verify
 * state changes.
 * @param hre {HardhatRuntimeEnvironment}
 * @param args {LPHelperArgs}
 */
export const depositWithArgs =
  (hre: HardhatRuntimeEnvironment, args: LPHelperArgs) =>
  /**
   * LendingPool helper function for testing the deposit functionality.
   *  - Approves the lending token amount for the lender.
   *  - Calculates the expected amount of TTokens to be received.
   *  - Calls the LP deposit function.
   *  - Verifies event was called with expected arguments.
   * @param lender {Signer} Signer to call the LP as.
   * @param amount {BigNumber} An amount of tokens to deposit.
   */
  async (): Promise<void> => {
    const { getNamedSigner } = hre
    const lender = await getNamedSigner('lender')
    const lenderAddress = await lender.getAddress()
    // Approve amount to loan
    const amount =
      args.amount == null
        ? await args.lendingToken.balanceOf(lenderAddress)
        : args.amount
    await args.lendingToken
      .connect(lender)
      .approve(args.diamond.address, amount)

    // Deposit into lending pool
    await args.diamond
      .connect(lender)
      .lendingPoolDeposit(args.lendingToken.address, amount)
      .should.emit(args.tToken, 'Mint')
  }

/**
 * Factory function to create a test LP helper to easily withdraw and verify
 * state changes.
 * @param hre {HardhatRuntimeEnvironment}
 * @param args {LPHelperArgs}
 */
export const withdrawWithArgs =
  (hre: HardhatRuntimeEnvironment, args: LPHelperArgs) =>
  /**
   * LendingPool helper function for testing the withdraw functionality.
   *  - Estimates the exact amount of tokens to be withdrawn/burned.
   *  - Calls the LP withdraw/withdrawAll function.
   *    - If no amount is specified, the withdrawALl function is called.
   *  - Verifies event was called with expected values.
   * @param lender {Signer} Signer to call the LP as.
   * @param amount {BigNumber} Optional amount to withdraw. Defaults to withdraw all.
   */
  async (): Promise<void> => {
    const { getNamedSigner } = hre
    const lender = await getNamedSigner('lender')
    const lenderAddress = await lender.getAddress()

    // Withdraw
    if (args.amount == null) {
      await args.tToken
        .connect(lender)
        .redeem(await args.tToken.balanceOf(lenderAddress))
        .should.emit(args.tToken, 'Redeem')
    } else {
      await args.tToken
        .connect(lender)
        .redeemUnderlying(args.amount)
        .should.emit(args.tToken, 'Redeem')
    }
  }

// /**
//  * Factory function to create a test LP helper to easily send funds.
//  * @param args {LPHelperArgs}
//  */
// export const creatLoanWithArgs = (args: LPHelperArgs) =>
//   /**
//    * Helper for sending funds from the LP to a borrower address.
//    *  - Verifies that the market state variables have been appropriately updated.
//    *  - Calls the LP createLoan function as the caller parameter.
//    * @param borrower {Signer} The Signer to send funds to.
//    * @param amount {BigNumber} An amount of funds to transfer.
//    * @param caller {Signer} The Signer to call the function as.
//    */
//   async (borrower: Signer, amount: BigNumber, caller: Signer) => {
//     // Grab the market state before transferring funds
//     const marketStateBefore = await args.diamond.callStatic.getLendingExchangeRateCurrent(
//       args.lendingToken.address
//     )
//
//     // Transfer funds from the LP
//     await args.lendingPool
//       .connect(caller)
//       .createLoan(amount, await borrower.getAddress())
//
//     // Check that the market state has been updated and funds have been transferred
//     const marketStateAfter = await args.lendingPool.callStatic.getMarketStateCurrent()
//     const expectedTotalBorrowed = marketStateBefore.totalBorrowed.add(amount)
//     expectedTotalBorrowed.should.eql(
//       marketStateAfter.totalBorrowed,
//       'LendingPool did not lend out funds'
//     )
//   }
//
// /**
//  * Factory function to create a test LP helper to easily repay funds.
//  * @param market {GetMarketReturn}
//  */
// export const repayWithArgs = (market: GetMarketReturn) =>
//   /**
//    * Helper for repaying funds to the LP for a borrower address.
//    *  - Approves the lending token amount to repay from the borrower.
//    *  - Calls the repay function from the caller.
//    *  - Verifies that the market state variables have been appropriately updated.
//    *  - Verifies the global interest earned variable has been appropriately updated.
//    * @param borrower {Signer} The Signer to transfer funds from.
//    * @param principal {BigNumber} The amount to repay that counts toward a loan's principal amount.
//    * @param interest {BigNumber} The amount to repay that counts toward a loan's interest amount.
//    * @param caller {Signer} The Signer to call the function as.
//    */
//   async (
//     borrower: Signer,
//     principal: BigNumber,
//     interest: BigNumber,
//     caller: Signer
//   ) => {
//     // Grab the market state before repaying funds
//     const marketStateBefore = await market.lendingPool.callStatic.getMarketStateCurrent()
//     // Grab the current interest earned before repaying funds
//     const interestEarnedBefore = await market.lendingPool.totalInterestEarned()
//
//     // Approve amount to repay
//     await market.lendingToken
//       .connect(borrower)
//       .approve(market.lendingPool.address, principal.add(interest))
//
//     // Repay funds to the LP
//     await market.lendingPool
//       .connect(caller)
//       .repay(principal, interest, await borrower.getAddress())
//
//     // Check that the market state has been updated and funds have been repaid
//     const marketStateAfter = await market.lendingPool.callStatic.getMarketStateCurrent()
//     const expectedRepaidAmount = marketStateBefore.totalRepaid.add(principal)
//     expectedRepaidAmount.should.eql(
//       marketStateAfter.totalRepaid,
//       'Incorrect principal amount of funds repaid'
//     )
//
//     // Check the correct amount of interest has been marked as earned
//     const interestEarnedAfter = await market.lendingPool.totalInterestEarned()
//     interestEarnedBefore
//       .add(interest)
//       .should.eql(interestEarnedAfter, 'Incorrect amount of interest earned')
//   }
