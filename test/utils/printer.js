const BigNumber = require('bignumber.js');
const loanStatus = require("./loanStatus");
const LoanInfoPrinter = require('./printers/LoanInfoPrinter');
const { secondsToDays, toUnits } = require("./consts");

const printLoanTerms = ({ tokenName, tokenDecimals }, loanTerms) => {
    console.group('Loan Terms:')
    console.log(`Borrower:          ${loanTerms.borrower}`);
    console.log(`Recipient:         ${loanTerms.recipient}`);
    console.log(`Interest Rate:     ${loanTerms.interestRate} == ${BigNumber(loanTerms.interestRate).div(100)} % = ${BigNumber(loanTerms.interestRate).div(10000)}`);
    console.log(`Collateral Ratio:  ${loanTerms.collateralRatio} == ${BigNumber(loanTerms.collateralRatio).div(100)} % = ${BigNumber(loanTerms.collateralRatio).div(10000)}`);
    console.log(`Max. Loan Amount:  ${loanTerms.maxLoanAmount} = ${toUnits(loanTerms.maxLoanAmount, tokenDecimals)} ${tokenName}`);
    console.log(`Duration:          ${loanTerms.duration} sec = ${secondsToDays(loanTerms.duration)} days`);
    console.groupEnd();
}

const printLoan = (loanInfo) => {
    console.group(`Loan:`);
    console.log(`ID:                    ${loanInfo.id.toString()}`);
    console.log(`Borrowed Amount:       ${loanInfo.borrowedAmount}`);
    console.log(`Terms Expiry:          ${loanInfo.termsExpiry}`);
    if(loanInfo.status === loanStatus.TermsSet) {
        console.log(`Start Time:            -- (loan is not active)`);
        console.log(`End Time:              -- (loan is not active)`);
    } else {
        console.log(`Start Time:            ${loanInfo.loanStartTime} / ${new Date(parseInt(loanInfo.loanStartTime)*1000)}`);
        const loanEndTime = parseInt(loanInfo.loanStartTime) + parseInt(loanInfo.loanTerms.duration);
        console.log(`End Time:              ${loanEndTime} / ${new Date(parseInt(loanEndTime)*1000)}`);
    }
    console.log(`Collateral:            ${loanInfo.collateral}`);
    console.log(`Last Collateral In:    ${loanInfo.lastCollateralIn}`);
    console.log(`Principal Owed:        ${loanInfo.principalOwed}`);
    console.log(`Interest Owed:         ${loanInfo.interestOwed}`);
    console.log(`Status:                ${loanInfo.status} ${JSON.stringify(loanStatus)}`);
    console.log(`Liquidated:            ${loanInfo.liquidated}`);
    console.groupEnd();
}

const printOraclePrice = (web3, tokenName, latestAnswer, latestTimestamp) => {
    console.group(`Oracle Price ${tokenName}`);
    const latestAnswerEther = web3.utils.fromWei(latestAnswer.toString(), 'ether');
    console.log(`Lastest Answer:        1 ${tokenName} = ${latestAnswer.toString()} WEI = ${latestAnswerEther.toString()} ETHER`);
    const latestTimestampInt = parseInt(latestTimestamp.toString()) * 1000;
    console.log(`Latest Timestamp:      ${latestTimestampInt} ms = ${new Date(latestTimestampInt).toISOString()}`);
    console.groupEnd();
}

const printCollateral = async (
    web3,
    {tokenName, tokenDecimals, collateralTokenName, collateralTokenDecimals},
    latestAnswer,
    loanInfo
) => {
    const printer = new LoanInfoPrinter(web3, loanInfo, { tokenName, decimals: tokenDecimals});
    console.group('Collateral / Liquidation Info:');
    console.log(`Total Principal:      ${printer.getOwedValues().principalOwed} = ${printer.getOwedValuesUnit().principalOwedUnit} ${tokenName}`);
    console.log(`Total Interest:       ${printer.getOwedValues().interestOwed} = ${printer.getOwedValuesUnit().interestOwedUnit} ${tokenName}`);
    console.log(`Total Owed:           ${printer.getTotalOwed()} = ${printer.getTotalOwedUnits()} ${tokenName} (principal + interest)`);
    const {
        collateralRatio,
        collateralRatioDecimals,
        collateralRatioPercentage
    } = printer.getCollateralRatioValues();
    const collateralNeededInTokens = printer.getCollateralNeededInTokens();
    console.log(`Coll. Ratio (value/%/decimals):    ${collateralRatio.toFixed(0)} = ${collateralRatioPercentage.toString()} % = ${collateralRatioDecimals}`);
    console.log(`Coll. Needed (Tokens):             ${collateralNeededInTokens.toFixed(0)} ${tokenName} (${collateralRatioPercentage}% of ${printer.getTotalOwed()} ${tokenName} -total owed-) => Total owed in ${tokenName}`);
    
    const latestAnswerEther = toUnits(latestAnswer.toString(), collateralTokenDecimals);
    console.log(`Lastest Price (${tokenName}/${collateralTokenName}):    1 ${tokenName} = ${latestAnswer.toString()} = ${latestAnswerEther.toString()} ${collateralTokenName}`);
    console.log(`Whole Token (${tokenName} / ${tokenDecimals}):        ${printer.getAWholeToken()} = 1 ${tokenName}`)
    /**
        1 token                         = latestAnswer
        collateralNeededInTokens tokens = X = collateralNeededInTokens * latestAnswer
     */
    console.log(`Start Time:            ${printer.getStartTime()} / ${printer.getStartDate()}`);
    console.log(`End Time:              ${printer.getEndTime()} / ${printer.getEndDate()}`);
    console.groupEnd();
    console.group('Collateral');
    console.log(`Current Collateral (A):        ${printer.getCollateral()} = ${printer.getCollateralUnits()} ${collateralTokenName}`);
    console.log(`Collateral. Needed (B):        ${printer.getCollateralNeededInWeis(latestAnswer).toFixed(0)} = ${printer.getCollateralNeededInWeisUnit(latestAnswer)} ${collateralTokenName} = (Coll. Needed (Tokens) * Lastest Price ${tokenName}/${collateralTokenName})`);
    console.log(`Need Collateral (B > A)?:      ${printer.isCollateralNeededGtCollateral(latestAnswer)}`);
    const nowTime = await printer.getNowTime();
    const nowDate = await printer.getNowDate();
    console.log(`Now:                           ${nowTime} / ${nowDate}`);
    console.log(`EndTime > Now?:                ${(await printer.isEndTimeLtNow())}`);
    console.log(`Liquidable?:                   ${(await printer.isLiquidable(latestAnswer))}`);
    console.groupEnd();
}

module.exports = {
    printLoanTerms,
    printLoan,
    printOraclePrice,
    printCollateral,
    printFullLoan: async (
        web3,
        { tokenName, tokenDecimals, collateralTokenName, collateralTokenDecimals },
        latestAnswer,
        loanInfo
    ) => {
        const times = 130;
        const main = times + 30;
        console.log('='.repeat(main));
        printLoan(loanInfo);
        console.log('-'.repeat(times));
        printLoanTerms({ tokenName, tokenDecimals }, loanInfo.loanTerms);
        console.log('-'.repeat(times));
        await printCollateral(
            web3,
            { tokenName, tokenDecimals, collateralTokenName, collateralTokenDecimals },
            latestAnswer,
            loanInfo
        );
        console.log('='.repeat(main));
    },
}
