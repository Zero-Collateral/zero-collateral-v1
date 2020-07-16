// JS Libraries
const withData = require('leche').withData;
const { t, getMillis, daysToMillis } = require('../../utils/consts');
const AggregatorInterfaceEncoder = require('../../utils/encoders/AggregatorInterfaceEncoder');

// Mock contracts
const ChainlinkAggregatorMock = artifacts.require("./mock/util/Mock.sol");

// Smart contracts
const ChainlinkPairAggregator = artifacts.require("./providers/chainlink/ChainlinkPairAggregator.sol");

contract('ChainlinkPairAggregatorGetPreviousTimestampTest', function (accounts) {
    const aggregatorInterfaceEncoder = new AggregatorInterfaceEncoder(web3);
    let chainlinkAggregator;
    let instance;
    
    beforeEach('Setup for each test', async () => {
        chainlinkAggregator = await ChainlinkAggregatorMock.new();
        assert(chainlinkAggregator);
        assert(chainlinkAggregator.address);

        instance = await ChainlinkPairAggregator.new(chainlinkAggregator.address, 18, 18);
        assert(instance);
        assert(instance.address);
    });

    withData({
        _1_basic: [getMillis(2020, 03, 14), 135, daysToMillis(5), undefined, false],
        _2_zeroDays: [getMillis(2020, 01, 02), 120, daysToMillis(0), undefined, false],
        _2_notHistory: [getMillis(2020, 01, 01), 120, getMillis(2020, 02, 02), 'NOT_ENOUGH_HISTORY', true]
    }, function(
        latestRoundResponse,
        getAnswerResponse,
        backTimestamp,
        expectedErrorMessage,
        mustFail,
    ) {    
        it(t('user', 'getPreviousTimestamp', 'Should able (or not) to get the previous timestamp.', mustFail), async function() {
            // Setup
            const latestRoundEncodeAbi = aggregatorInterfaceEncoder.encodeLatestRound();
            await chainlinkAggregator.givenMethodReturnUint(latestRoundEncodeAbi, latestRoundResponse.toString());

            const getAnswerEncodeAbi = aggregatorInterfaceEncoder.encodeGetAnswer();
            await chainlinkAggregator.givenMethodReturnUint(getAnswerEncodeAbi, getAnswerResponse.toString());

            try {
                // Invocation
                const result = await instance.getPreviousTimestamp(backTimestamp);
                
                // Assertions
                assert(!mustFail, 'It should have failed because data is invalid.');
                assert(result);
            } catch (error) {
                // Assertions
                assert(mustFail);
                assert(error);
                assert(error.message.includes(expectedErrorMessage));
            }
        });
    });
});