import {
  BigNumber,
  BigNumberish,
  ContractTransaction,
  PayableOverrides,
  Signer,
} from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import moment from 'moment'

import { getNativeToken } from '../../config'
import { claimNFT, getPrice } from '../../tasks'
import { ERC20, ITellerDiamond, TellerNFT } from '../../types/typechain'
import { getFunds } from './get-funds'
import { mockCRAResponse } from './mock-cra-response'

export enum LoanType {
  ZERO_COLLATERAL,
  UNDER_COLLATERALIZED,
  OVER_COLLATERALIZED,
}
export interface LoanHelpersReturn {
  diamond: ITellerDiamond
  details: PromiseReturnType<typeof loanDetails>
  repay: (amount: BigNumberish, from?: Signer) => ReturnType<typeof repayLoan>
  escrowRepay: (
    amount: BigNumberish,
    from?: Signer
  ) => ReturnType<typeof escrowRepayLoan>
  collateral: {
    needed: () => ReturnType<typeof collateralNeeded>
    current: () => ReturnType<typeof collateralCurrent>
    deposit: (
      amount: BigNumberish,
      from?: Signer
    ) => ReturnType<typeof depositCollateral>
    withdraw: (
      amount: BigNumberish,
      from?: Signer
    ) => ReturnType<typeof withdrawCollateral>
  }
}

export const loanHelpers = async (
  hre: HardhatRuntimeEnvironment,
  loanID: string
): Promise<LoanHelpersReturn> => {
  const { contracts } = hre
  const diamond = await contracts.get<ITellerDiamond>('TellerDiamond')
  const details = await loanDetails(hre, loanID)
  return {
    diamond,
    details,
    repay: (amount: BigNumberish, from?: Signer) =>
      repayLoan({ diamond, details, amount, from }),
    escrowRepay: (amount: BigNumberish, from?: Signer) =>
      escrowRepayLoan({ diamond, details, amount, from }),
    collateral: {
      needed: () => collateralNeeded({ diamond, details }),
      current: () => collateralCurrent({ diamond, details }),
      deposit: (amount: BigNumberish, from?: Signer) =>
        depositCollateral(hre, { diamond, details, amount, from }),
      withdraw: (amount: BigNumberish, from?: Signer) =>
        withdrawCollateral({ diamond, details, amount, from }),
    },
  }
}

interface CreateLoanWithNftArgs {
  lendToken: string | ERC20
  borrower?: string
  deployer?: string
  amount?: BigNumberish
  amountBN?: BigNumberish
  duration?: moment.Duration
}
export interface CreateLoanArgs {
  lendToken: string | ERC20
  collToken: string | ERC20
  loanType: LoanType
  amount?: BigNumberish
  amountBN?: BigNumberish
  borrower?: string
  duration?: moment.Duration
  nft?: boolean
}
export interface CreateLoanReturn {
  tx: Promise<ContractTransaction>
  getHelpers: () => Promise<LoanHelpersReturn>
}
export const createLoan = async (
  hre: HardhatRuntimeEnvironment,
  args: CreateLoanArgs
): Promise<CreateLoanReturn> => {
  const {
    lendToken,
    collToken,
    loanType,
    amount = 100,
    amountBN,
    duration = moment.duration(1, 'day'),
  } = args
  const { contracts, tokens, getNamedAccounts, toBN } = hre
  const diamond = await contracts.get<ITellerDiamond>('TellerDiamond')
  const lendingToken =
    typeof lendToken === 'string' ? await tokens.get(lendToken) : lendToken

  const collateralToken =
    typeof collToken === 'string' ? await tokens.get(collToken) : collToken
  const borrower = args.borrower ?? (await getNamedAccounts()).borrower
  const loanAmount = amountBN ?? toBN(amount, await lendingToken.decimals())
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
  const craReturn = await mockCRAResponse(hre, {
    lendingToken: lendingToken.address,
    loanAmount,
    loanTermLength: duration.asSeconds(),
    collateralRatio: collateralRatio,
    interestRate: '400',
    borrower,
  })
  // Create loan with terms
  const tx = diamond
    .connect(hre.ethers.provider.getSigner(borrower))
    .createLoanWithTerms(
      craReturn.request,
      [craReturn.responses],
      collateralToken.address,
      '0'
    )
  return {
    tx,
    getHelpers: async (): Promise<LoanHelpersReturn> => {
      await tx
      const allBorrowerLoans = await diamond.getBorrowerLoans(borrower)
      const loanID = allBorrowerLoans[allBorrowerLoans.length - 1].toString()
      return await loanHelpers(hre, loanID)
    },
  }
}

/**
 * @description: function helper that sets the collateral token and ratio and creates a mock CRA
 * response to plug into the newly merged create loan function that:
 *  - sets the terms
 *  - deposits collateral
 *  - takes out the loan
 *
 * @param args: CreateLoanArgs parameters to create the loan
 * @returns: Promise<CreateLoanReturn> helper variables to help run our tests
 */
export const takeOutLoanWithoutNfts = async (
  hre: HardhatRuntimeEnvironment,
  args: CreateLoanArgs
): Promise<CreateLoanReturn> => {
  const {
    lendToken,
    collToken,
    loanType,
    amount = 100,
    amountBN,
    duration = moment.duration(1, 'day'),
  } = args
  const { contracts, tokens, getNamedAccounts, toBN } = hre
  // define diamond contract
  const diamond = await contracts.get<ITellerDiamond>('TellerDiamond')

  // lending token
  const lendingToken =
    typeof lendToken === 'string' ? await tokens.get(lendToken) : lendToken

  // collateral token
  const collateralToken =
    typeof collToken === 'string' ? await tokens.get(collToken) : collToken
  const collateralIsNative =
    collateralToken.address === getNativeToken(hre.network)

  // set borrower and loan amount
  const borrower = args.borrower ?? (await getNamedAccounts()).borrower
  const loanAmount = amountBN ?? toBN(amount, await lendingToken.decimals())

  // depending on the loan type, we set a different collateral ratio. 10000 = 100%
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

  // create our mock CRA response
  const craReturn = await mockCRAResponse(hre, {
    lendingToken: lendingToken.address,
    loanAmount,
    loanTermLength: duration.asSeconds(),
    collateralRatio: collateralRatio,
    interestRate: '400',
    borrower,
  })

  const { value: collValue } = await getPrice(
    {
      src: await lendingToken.symbol(),
      dst: await collateralToken.symbol(),
      amount: hre.fromBN(loanAmount, await lendingToken.decimals()),
    },
    hre
  )
  const collAmount = hre.toBN(collValue, await collateralToken.decimals())
  const nativeAmount = collateralIsNative ? collAmount : BigNumber.from(0)
  if (!collateralIsNative) {
    await getFunds({
      tokenSym: await collateralToken.symbol(),
      amount: collAmount,
      to: borrower,
      hre,
    })
    await collateralToken
      .connect(hre.ethers.provider.getSigner(borrower))
      .approve(diamond.address, collAmount)
  }

  // call the takeOutLoan function from the diamond
  const tx = diamond
    .connect(hre.ethers.provider.getSigner(borrower))
    .takeOutLoan(
      { request: craReturn.request, responses: craReturn.responses },
      collateralToken.address,
      collAmount,
      { value: nativeAmount.toString() }
    )

  // return our transaction and our helper variable
  return {
    tx,
    getHelpers: async (): Promise<LoanHelpersReturn> => {
      await tx
      const allBorrowerLoans = await diamond.getBorrowerLoans(borrower)
      const loanID = allBorrowerLoans[allBorrowerLoans.length - 1].toString()
      return await loanHelpers(hre, loanID)
    },
  }
}

/**
 * @description: It creates, signs, apply with NFTs and takes out a loan in one function
 * @param args: Arguments we specify to create our Loan by depositing NFT
 * @returns Promise<CreateLoanReturn> that gives us data to help run our tests
 */
export const takeOutLoanWithNfts = async (
  hre: HardhatRuntimeEnvironment,
  args: CreateLoanWithNftArgs
): Promise<CreateLoanReturn> => {
  const { contracts, tokens, toBN, getNamedSigner } = hre
  const { lendToken, amount = 100, duration = moment.duration(1, 'day') } = args

  // diamond contract
  const diamond = await contracts.get<ITellerDiamond>('TellerDiamond')

  // lending token
  const lendingToken =
    typeof lendToken === 'string' ? await tokens.get(lendToken) : lendToken

  // amount in loan
  const loanAmount = toBN(amount, await lendingToken.decimals())

  // get the borrower, deployer and borrower's signer
  // const deployer = await getNamedSigner('deployer')
  const borrower = '0x86a41524cb61edd8b115a72ad9735f8068996688'
  const { signer: borrowerSigner } = await hre.evm.impersonate(borrower)

  // Claim user's NFT as borrower
  await claimNFT({ account: borrower, merkleIndex: 0 }, hre)

  // Get the sum of loan amount to take out
  const nft = await contracts.get<TellerNFT>('TellerNFT')

  // get all the borrower's NFTs
  const ownedNFTs = await nft
    .getOwnedTokens(borrower)
    .then((arr) => (arr.length > 2 ? arr.slice(0, 2) : arr))

  // Set NFT approval
  await nft.connect(borrowerSigner).setApprovalForAll(diamond.address, true)

  // Stake NFTs by transferring from the msg.sender (borrower) to the diamond
  await diamond.connect(borrowerSigner).stakeNFTs(ownedNFTs)

  // Create mockCRAResponse
  const craReturn = await mockCRAResponse(hre, {
    lendingToken: lendingToken.address,
    loanAmount,
    loanTermLength: duration.asSeconds(),
    collateralRatio: 0,
    interestRate: '400',
    borrower,
  })

  // plug it in the takeOutLoanWithNfts function along with the proofs to apply to the loan!
  const tx = diamond
    .connect(borrowerSigner)
    .takeOutLoanWithNFTs(
      { request: craReturn.request, responses: craReturn.responses },
      ownedNFTs
    )

  // return our transaction and our helper variables
  return {
    tx,
    getHelpers: async (): Promise<LoanHelpersReturn> => {
      await tx
      const allBorrowerLoans = await diamond.getBorrowerLoans(borrower)
      const loanID = allBorrowerLoans[allBorrowerLoans.length - 1].toString()
      return await loanHelpers(hre, loanID)
    },
  }
}

interface LoanDetailsReturn {
  lendingToken: ERC20
  collateralToken: ERC20
  loan: PromiseReturnType<typeof ITellerDiamond.prototype.getLoan>
  debt: PromiseReturnType<typeof ITellerDiamond.prototype.getDebtOwed>
  terms: PromiseReturnType<typeof ITellerDiamond.prototype.getLoanTerms>
  totalOwed: BigNumber
  borrower: {
    address: string
    signer: Signer
  }
  refresh: () => ReturnType<typeof loanDetails>
}
const loanDetails = async (
  hre: HardhatRuntimeEnvironment,
  loanID: BigNumberish
): Promise<LoanDetailsReturn> => {
  const { contracts, tokens } = hre
  const diamond = await contracts.get<ITellerDiamond>('TellerDiamond')
  const loan = await diamond.getLoan(loanID)
  const lendingToken = await tokens.get(loan.lendingToken)
  const collateralToken = await tokens.get(loan.collateralToken)
  const debt = await diamond.getDebtOwed(loan.id)
  const totalOwed = debt.principalOwed.add(debt.interestOwed)
  const terms = await diamond.getLoanTerms(loan.id)
  const signer = await hre.ethers.provider.getSigner(loan.borrower)
  return {
    loan,
    lendingToken,
    collateralToken,
    debt,
    totalOwed,
    terms,
    borrower: { address: loan.borrower, signer },
    refresh: () => loanDetails(hre, loanID),
  }
}

interface CommonLoanArgs {
  diamond: ITellerDiamond
  details: LoanDetailsReturn
  from?: Signer
}

interface DepositCollateralArgs extends CommonLoanArgs {
  amount?: BigNumberish
}

const depositCollateral = async (
  hre: HardhatRuntimeEnvironment,
  args: DepositCollateralArgs
): Promise<ContractTransaction> => {
  const {
    diamond,
    details,
    amount = await collateralNeeded({ diamond, details }),
    from = details.borrower.signer,
  } = args
  const { tokens } = hre
  const weth = await tokens.get('WETH')
  const collateralToken = await tokens.get(details.loan.collateralToken)
  const options: PayableOverrides = {}
  if (
    hre.ethers.utils.getAddress(details.loan.collateralToken) ==
    hre.ethers.utils.getAddress(weth.address)
  ) {
    options.value = amount
  } else {
    await collateralToken.approve(diamond.address, amount)
  }
  return await diamond
    .connect(from)
    .depositCollateral(details.loan.id, amount, options)
}
interface WithdrawCollateralArgs extends CommonLoanArgs {
  amount: BigNumberish
}
const withdrawCollateral = async (
  args: WithdrawCollateralArgs
): Promise<ContractTransaction> => {
  const { diamond, details, amount, from = details.borrower.signer } = args
  return await diamond.connect(from).withdrawCollateral(amount, details.loan.id)
}
interface CollateralNeededArgs extends CommonLoanArgs {}
const collateralNeeded = async (
  args: CollateralNeededArgs
): Promise<BigNumber> => {
  const { diamond, details } = args
  const { neededInCollateralTokens } =
    await diamond.callStatic.getCollateralNeededInfo(details.loan.id)
  return neededInCollateralTokens
}
interface CollateralCurrentArgs extends CommonLoanArgs {}
const collateralCurrent = async (
  args: CollateralCurrentArgs
): Promise<BigNumber> => {
  const { diamond, details } = args
  return await diamond.getLoanCollateral(details.loan.id)
}
export interface RepayLoanArgs extends CommonLoanArgs {
  amount: BigNumberish
}
export const repayLoan = async (
  args: RepayLoanArgs
): Promise<ContractTransaction> => {
  const {
    diamond,
    details: { loan, borrower },
    amount,
    from = borrower.signer,
  } = args
  return await diamond.connect(from).repayLoan(loan.id, amount)
}
export const escrowRepayLoan = async (
  args: RepayLoanArgs
): Promise<ContractTransaction> => {
  const {
    diamond,
    details: { loan, borrower },
    amount,
    from = borrower.signer,
  } = args
  return await diamond.connect(from).escrowRepay(loan.id, amount)
}
