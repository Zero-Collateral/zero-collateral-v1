// Util classes
const { teller, tokens } = require('../../../scripts/utils/contracts');
const {
  loans: loansActions,
  oracles: oraclesActions,
  tokens: tokensActions,
  blockchain: blockchainActions,
} = require('../../../scripts/utils/actions');
const { toDecimals } = require('../../../test/utils/consts');
const { MAX_VALUE } = require('../../../config/consts');

module.exports = async (testContext) => {
  const { accounts, getContracts, collTokenName, timer, tokenName } = testContext;
  console.log(
    'Scenario: Loans#9 - Error requesting loan terms due to loan duration exceeds max duration.'
  );
  const allContracts = await getContracts.getAllDeployed(
    { teller, tokens },
    tokenName,
    collTokenName
  );
  const { token, collateralToken } = allContracts;
  const tokenInfo = await tokensActions.getInfo({ token });
  const collateralTokenInfo = await tokensActions.getInfo({
    token: collateralToken,
  });
  const depositFundsAmount = toDecimals(500, tokenInfo.decimals);
  const maxAmountRequestLoanTerms = toDecimals(100, tokenInfo.decimals);
  const amountTakeOut = toDecimals(100, tokenInfo.decimals);
  let initialOraclePrice;
  if (collTokenName.toLowerCase() === 'eth') {
    initialOraclePrice = '0.00295835';
  }
  if (collTokenName.toLowerCase() === 'link') {
    initialOraclePrice = '0.100704';
  }
  const durationInDays = 61;
  const signers = await accounts.getAllAt(12, 13);
  const borrowerTxConfig = await accounts.getTxConfigAt(1);
  const lenderTxConfig = await accounts.getTxConfigAt(0);

  // Sets Initial Oracle Price
  await oraclesActions.setPrice(
    allContracts,
    { testContext },
    { price: initialOraclePrice }
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
    borrower: borrowerTxConfig.from,
  };
  const loanResponseTemplate = {
    interestRate: 4000,
    collateralRatio: 6000,
    maxLoanAmount: maxAmountRequestLoanTerms,
    signers,
    responseTime: 50,
  };
  await loansActions.requestLoanTerms(
    allContracts,
    { txConfig: borrowerTxConfig, testContext },
    {
      loanTermsRequestTemplate,
      loanResponseTemplate,
      expectedErrorMessage: 'DURATION_EXCEEDS_MAX_DURATION',
    }
  );
};
