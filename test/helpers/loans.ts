import { BigNumber, BigNumberish, ContractTransaction, Signer } from 'ethers'
import { contracts, ethers, toBN, tokens } from 'hardhat'

import { ITellerDiamond } from '../../types/typechain'
import { ONE_DAY } from '../../utils/consts'
import { mockCRAResponse } from './mock-cra-response'

type PromiseReturn<T> = T extends PromiseLike<infer U> ? U : T

export enum LoanType {
  ZERO_COLLATERAL,
  UNDER_COLLATERALIZED,
  OVER_COLLATERALIZED,
}

export interface LoanHelpersReturn {
  diamond: ITellerDiamond
  details: PromiseReturn<ReturnType<typeof loanDetails>>
  takeOut: (amount?: BigNumberish) => ReturnType<typeof takeOutLoan>
  repay: (amount: BigNumberish) => ReturnType<typeof repayLoan>
  collateral: {
    needed: PromiseReturn<ReturnType<typeof collateralNeeded>>
    deposit: (amount?: BigNumberish) => ReturnType<typeof depositCollateral>
    withdraw: (amount: BigNumberish) => ReturnType<typeof withdrawCollateral>
  }
}

export const loanHelpers = async (
  loanID: string
): Promise<LoanHelpersReturn> => {
  const diamond = await contracts.get<ITellerDiamond>('TellerDiamond')
  const details = await loanDetails(loanID)
  const collNeeded = await collateralNeeded({ diamond, details })
  return {
    diamond,
    details,
    takeOut: (amount = details.loan.loanTerms.maxLoanAmount) =>
      takeOutLoan({ diamond, details, amount }),
    repay: (amount: BigNumberish) => repayLoan({ diamond, details, amount }),
    collateral: {
      needed: collNeeded,
      deposit: (amount = collNeeded) =>
        depositCollateral({ diamond, details, amount }),
      withdraw: (amount: BigNumberish) =>
        withdrawCollateral({ diamond, details, amount }),
    },
  }
}

interface CreateLoanArgs {
  lendTokenSym: string
  collTokenSym: string
  borrower: string
  loanType: LoanType
  amount: BigNumberish
}

export interface CreateLoanReturn extends LoanHelpersReturn {
  tx: ContractTransaction
}

export const createLoan = async (
  args: CreateLoanArgs
): Promise<CreateLoanReturn> => {
  const {
    lendTokenSym,
    collTokenSym,
    borrower,
    loanType,
    amount: loanAmount,
  } = args

  const diamond = await contracts.get<ITellerDiamond>('TellerDiamond')
  const collToken = await tokens.get(collTokenSym)
  const lendingToken = await tokens.get(lendTokenSym)

  // Set up collateral
  let collateralRatio = 0
  switch (loanType) {
    case LoanType.ZERO_COLLATERAL:
      break
    case LoanType.UNDER_COLLATERALIZED:
      collateralRatio = 5000
      break
    case LoanType.OVER_COLLATERALIZED:
      collateralRatio = 15000
      break
  }

  // Get mock cra request and response
  const craReturn = await mockCRAResponse({
    lendingToken: lendingToken.address,
    loanAmount: toBN(loanAmount).toString(),
    loanTermLength: ONE_DAY.toString(),
    collateralRatio: collateralRatio.toString(),
    interestRate: '400',
    borrower,
  })

  // Create loan with terms
  const tx = await diamond
    .connect(ethers.provider.getSigner(borrower))
    .createLoanWithTerms(
      craReturn.request,
      [craReturn.response],
      collToken.address,
      '0'
    )
  await tx.wait()

  // Return ID for created loan
  const allBorrowerLoans = await diamond.getBorrowerLoans(borrower)
  const loanID = allBorrowerLoans[allBorrowerLoans.length - 1].toString()
  return {
    ...(await loanHelpers(loanID)),
    tx,
  }
}

interface LoanDetailsReturn {
  loan: PromiseReturn<ReturnType<typeof ITellerDiamond.prototype.getLoan>>
  borrower: {
    address: string
    signer: Signer
  }
  refresh: () => ReturnType<typeof loanDetails>
}

const loanDetails = async (
  loanID: BigNumberish
): Promise<LoanDetailsReturn> => {
  const diamond = await contracts.get<ITellerDiamond>('TellerDiamond')
  const loan = await diamond.getLoan(loanID)
  const signer = await ethers.provider.getSigner(loan.loanTerms.borrower)

  return {
    loan,
    borrower: { address: loan.loanTerms.borrower, signer },
    refresh: () => loanDetails(loanID),
  }
}

interface CommonLoanArgs {
  diamond: ITellerDiamond
  details: LoanDetailsReturn
  from?: string | Signer
}

interface TakeOutLoanArgs extends CommonLoanArgs {
  amount?: BigNumberish
}

const takeOutLoan = async (
  args: TakeOutLoanArgs
): Promise<ContractTransaction> => {
  const {
    diamond,
    details,
    amount = details.loan.loanTerms.maxLoanAmount,
    from = details.borrower.signer,
  } = args

  const tx = await diamond.connect(from).takeOutLoan(details.loan.id, amount)
  await tx.wait()
  return tx
}

interface DepositCollateralArgs extends CommonLoanArgs {
  amount?: BigNumberish
}

const depositCollateral = async (
  args: DepositCollateralArgs
): Promise<ContractTransaction> => {
  const {
    diamond,
    details,
    amount = await collateralNeeded({ diamond, details }),
    from = details.borrower.signer,
  } = args

  const tx = await diamond
    .connect(from)
    .depositCollateral(details.borrower.address, details.loan.id, amount, {
      value: amount, // TODO: only if collateral is ETH
    })
  await tx.wait()
  return tx
}

interface WithdrawCollateralArgs extends CommonLoanArgs {
  amount: BigNumberish
}

const withdrawCollateral = async (
  args: WithdrawCollateralArgs
): Promise<ContractTransaction> => {
  const { diamond, details, amount, from = details.borrower.signer } = args

  const tx = await diamond
    .connect(from)
    .withdrawCollateral(amount, details.loan.id)
  await tx.wait()
  return tx
}

interface CollateralNeededArgs extends CommonLoanArgs {}

const collateralNeeded = async (
  args: CollateralNeededArgs
): Promise<BigNumber> => {
  const { diamond, details } = args
  const { neededInCollateralTokens } = await diamond.getCollateralNeededInfo(
    details.loan.id
  )
  return neededInCollateralTokens
}

interface RepayLoanArgs extends CommonLoanArgs {
  amount: BigNumberish
}

const repayLoan = async (args: RepayLoanArgs): Promise<ContractTransaction> => {
  const {
    diamond,
    details: { loan, borrower },
    amount,
    from = borrower.signer,
  } = args

  const tx = await diamond.connect(from).repay(amount, loan.id)
  await tx.wait()
  return tx
}