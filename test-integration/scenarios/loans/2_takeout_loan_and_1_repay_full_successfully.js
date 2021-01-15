// Util classes
const { teller, tokens } = require('../../../scripts/utils/contracts');
const {
  loans: loansActions,
  oracles: oraclesActions,
  blockchain: blockchainActions,
  escrow: escrowActions,
  tokens: tokensActions,
} = require('../../../scripts/utils/actions');
const { loans: loansAssertions } = require('../../../scripts/utils/assertions');
const { toDecimals } = require('../../../test/utils/consts');

module.exports = async (testContext) => {
  const { accounts, getContracts, timer, collTokenName, tokenName } = testContext;
  console.log(
    'Scenario: Loans#2 - Take out a loan and repay all at once in full successfully.'
  );

  const allContracts = await getContracts.getAllDeployed(
    { teller, tokens },
    tokenName,
    collTokenName
  );
  const { token, collateralToken } = allContracts;

  const borrower = await accounts.getAt(1);
  const lenderTxConfig = await accounts.getTxConfigAt(0);
  const borrowerTxConfig = await accounts.getTxConfigAt(1);

  const tokenInfo = await tokensActions.getInfo({ token });
  const collateralTokenInfo = await tokensActions.getInfo({
    token: collateralToken,
  });
  let currentOraclePrice;
  let collateralAmountDepositCollateral;
  let collateralAmountWithdrawCollateral;
  if (collTokenName.toLowerCase() === 'eth') {
    currentOraclePrice = '0.00295835';
    collateralAmountDepositCollateral = toDecimals(0.3, collateralTokenInfo.decimals);
    collateralAmountWithdrawCollateral = toDecimals(0.2, collateralTokenInfo.decimals);
  }
  if (collTokenName.toLowerCase() === 'link') {
    currentOraclePrice = '0.100704';
    collateralAmountDepositCollateral = toDecimals(6.1, collateralTokenInfo.decimals);
    collateralAmountWithdrawCollateral = toDecimals(1, collateralTokenInfo.decimals);
  }
  const depositFundsAmount = toDecimals(300, tokenInfo.decimals);
  const maxAmountRequestLoanTerms = toDecimals(100, tokenInfo.decimals);
  const amountTakeOut = toDecimals(50, tokenInfo.decimals);
  const amountRepay_1 = toDecimals(55, tokenInfo.decimals);

  const durationInDays = 10;
  const signers = await accounts.getAllAt(12, 13);

  // Sets Initial Oracle Price
  await oraclesActions.setPrice(
    allContracts,
    { testContext },
    { price: currentOraclePrice }
  );
  await loansActions.printPairAggregatorInfo(
    allContracts,
    { testContext },
    { tokenInfo, collateralTokenInfo }
  );

  // Deposit tokens on lending pool.
  await loansActions.depositFunds(
    allContracts,
    { txConfig: lenderTxConfig, testContext },
    { amount: depositFundsAmount }
  );

  // Requesting the loan terms.
  const loanTermsRequestTemplate = {
    amount: amountTakeOut,
    durationInDays,
    borrower,
  };
  const loanResponseTemplate = {
    interestRate: 4000,
    collateralRatio: 6000,
    maxLoanAmount: maxAmountRequestLoanTerms,
    signers,
    responseTime: 50,
  };
  const loanInfoRequestLoanTerms = await loansActions.requestLoanTerms(
    allContracts,
    { txConfig: borrowerTxConfig, testContext },
    { loanTermsRequestTemplate, loanResponseTemplate }
  );

  // Depositing collateral.
  await loansActions.depositCollateral(
    allContracts,
    { txConfig: borrowerTxConfig, testContext },
    { loanId: loanInfoRequestLoanTerms.id, amount: collateralAmountDepositCollateral }
  );

  await blockchainActions.advanceMinutes({ timer }, { testContext }, { minutes: 2 });

  await loansActions.printLoanInfo(
    allContracts,
    { testContext },
    {
      loanId: loanInfoRequestLoanTerms.id,
      collateralTokenInfo,
      tokenInfo,
    }
  );

  // Take out a loan.
  await loansActions.takeOutLoan(
    allContracts,
    { txConfig: borrowerTxConfig, testContext },
    { loanId: loanInfoRequestLoanTerms.id, amount: amountTakeOut }
  );

  await loansActions.withdrawCollateral(
    allContracts,
    { txConfig: borrowerTxConfig, testContext },
    { loanId: loanInfoRequestLoanTerms.id, amount: collateralAmountWithdrawCollateral }
  );

  await blockchainActions.advanceMinutes({ timer }, { testContext }, { minutes: 5 });

  await loansActions.getFunds(
    { token },
    { testContext },
    { amount: amountRepay_1, to: borrower }
  );
  await loansActions.repay(
    allContracts,
    { txConfig: borrowerTxConfig, testContext },
    { loanId: loanInfoRequestLoanTerms.id, amount: amountRepay_1 }
  );

  await loansActions.printLoanInfo(
    allContracts,
    { testContext },
    {
      loanId: loanInfoRequestLoanTerms.id,
      collateralTokenInfo,
      tokenInfo,
    }
  );

  await escrowActions.claimTokensByLoanId(
    allContracts,
    { txConfig: borrowerTxConfig, testContext },
    { loanId: loanInfoRequestLoanTerms.id, recipient: borrowerTxConfig.from }
  );

  await loansActions.printLoanInfo(
    allContracts,
    { testContext },
    {
      loanId: loanInfoRequestLoanTerms.id,
      collateralTokenInfo,
      tokenInfo,
    }
  );

  await loansAssertions.assertLoanValues(
    allContracts,
    { testContext },
    {
      id: loanInfoRequestLoanTerms.id,
    }
  );
};
