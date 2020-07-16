// JS Libraries
const withData = require('leche').withData;
const { t, THIRTY_DAYS, getLatestTimestamp, FIVE_MIN, NULL_ADDRESS, TERMS_SET, ACTIVE } = require('../utils/consts');
const { createLoanTerms } = require('../utils/structs');
const { loans } = require('../utils/events');

const ERC20InterfaceEncoder = require('../utils/encoders/ERC20InterfaceEncoder');
const PairAggregatorEncoder = require('../utils/encoders/PairAggregatorEncoder');
const LendingPoolInterfaceEncoder = require('../utils/encoders/LendingPoolInterfaceEncoder');

// Mock contracts
const Mock = artifacts.require("./mock/util/Mock.sol");

// Smart contracts
const Settings = artifacts.require("./base/Settings.sol");
const Loans = artifacts.require("./mock/base/EtherCollateralLoansMock.sol");

contract('EtherCollateralLoansTakeOutLoanTest', function (accounts) {
    const erc20InterfaceEncoder = new ERC20InterfaceEncoder(web3);
    const pairAggregatorEncoder = new PairAggregatorEncoder(web3);
    const lendingPoolInterfaceEncoder = new LendingPoolInterfaceEncoder(web3);

    let instance;
    let oracleInstance;
    let lendingPoolInstance;
    let loanTermsConsInstance;
    let lendingTokenInstance;

    const mockLoanID = 0;

    const borrower = accounts[3]

    let loanTerms = createLoanTerms(borrower, NULL_ADDRESS, 1475, 3564, 15000000, 0)
    
    beforeEach('Setup for each test', async () => {
        lendingPoolInstance = await Mock.new();
        lendingTokenInstance = await Mock.new();
        oracleInstance = await Mock.new();
        const settingsInstance = await Settings.new(1, 1, THIRTY_DAYS, FIVE_MIN, THIRTY_DAYS, 9500);
        loanTermsConsInstance = await Mock.new();
        instance = await Loans.new();
        await instance.initialize(
            oracleInstance.address,
            lendingPoolInstance.address,
            loanTermsConsInstance.address,
            settingsInstance.address,
        );

        // encode lending token address
        const encodeLendingToken = lendingPoolInterfaceEncoder.encodeLendingToken();
        await lendingPoolInstance.givenMethodReturnAddress(encodeLendingToken, lendingTokenInstance.address);
    });

    withData({
        _1_max_loan_exceeded: [15000001, false, false, 300000, NULL_ADDRESS, 0, 0, true, 'MAX_LOAN_EXCEEDED'],
        _2_loan_terms_expired: [15000000, true, false, 300000, NULL_ADDRESS, 0, 0, true, 'LOAN_TERMS_EXPIRED'],
        _3_collateral_deposited_recently: [15000000, false, true, 300000, NULL_ADDRESS, 0, 0, true, 'COLLATERAL_DEPOSITED_RECENTLY'],
        // colateralNeeded = ((15181849*0.3564)*8346020000000000/10**18 which is 45158. The loan has 40000
        _4_more_collateral_needed: [15000000, false, false, 300000, NULL_ADDRESS, 8346020000000000, 18, true, 'MORE_COLLATERAL_REQUIRED'],
        // colateralNeeded = ((15181849*0.3564)*7392727000000000/10**18 which is 40000 exactly - the loan has 40000
        _5_successful_loan: [15000000, false, false, 300000, NULL_ADDRESS, 7392727000000000, 18, false, undefined],
        _6_with_recipient: [15000000, false, false, 300000, accounts[4], 7392727000000000, 18, false, undefined],
    }, function(
        amountToBorrow,
        termsExpired,
        collateralTooRecent,
        loanDuration,
        recipient,
        oraclePrice,
        tokenDecimals,
        mustFail,
        expectedErrorMessage
    ) {
        it(t('user', 'takeOutLoan', 'Should able to take out a loan.', false), async function() {
            // Setup
            const timeNow = await getLatestTimestamp()

            // encode current token price
            const encodeGetLatestAnswer = pairAggregatorEncoder.encodeGetLatestAnswer();
            await oracleInstance.givenMethodReturnUint(encodeGetLatestAnswer, oraclePrice.toString());

            // encode token decimals
            const encodeDecimals = erc20InterfaceEncoder.encodeDecimals();
            await lendingTokenInstance.givenMethodReturnUint(encodeDecimals, tokenDecimals);

            let termsExpiry = timeNow
            if (termsExpired) {
              termsExpiry -= 1
            } else {
              termsExpiry += FIVE_MIN
            }

            let lastCollateralIn = timeNow
            if (!collateralTooRecent) {
              lastCollateralIn -= FIVE_MIN
            }

            loanTerms.duration = loanDuration
            loanTerms.recipient = recipient
            await instance.setLoan(mockLoanID, loanTerms, termsExpiry, 0, 40000, lastCollateralIn, 0, 0, loanTerms.maxLoanAmount, TERMS_SET, false)

            try {
                // Invocation
                const tx = await instance.takeOutLoan(mockLoanID, amountToBorrow, { from: borrower });
                const txTime = (await web3.eth.getBlock(tx.receipt.blockNumber)).timestamp
                const interestOwed = Math.floor(amountToBorrow * 1475 * loanDuration / 10000 / 3650000)
                const loan = await instance.loans.call(mockLoanID)

                assert.equal(loan['loanStartTime'].toString(), txTime)
                assert.equal(loan['principalOwed'].toString(), amountToBorrow)
                assert.equal(loan['interestOwed'].toString(), interestOwed)
                assert.equal(loan['status'].toString(), ACTIVE)

                loans
                    .loanTakenOut(tx)
                    .emitted(mockLoanID, borrower, amountToBorrow)

            } catch (error) {
                assert(mustFail);
                assert(error);
                assert.equal(error.reason, expectedErrorMessage);
            }
        });
    });
});