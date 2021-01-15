// JS Libraries
const withData = require('leche').withData;
const { t } = require('../utils/consts');
const { atmGovernance } = require('../utils/events');

// Mock contracts
const Mock = artifacts.require('./mock/util/Mock.sol');

// Smart contracts
const ATMGovernance = artifacts.require('./atm/ATMGovernance.sol');

contract('ATMGovernanceAddDataProviderTest', function (accounts) {
  const owner = accounts[0];
  let instance;
  let settingsInstance;
  const ANY_VALUE = 1;

  beforeEach('Setup for each test', async () => {
    settingsInstance = await Mock.new();
    instance = await ATMGovernance.new();
    await instance.initialize(settingsInstance.address, owner, ANY_VALUE);
  });

  // Testing values
  const DATA_TYPE_INDEX = 1;
  const DATA_PROVIDER_INDEX = 0;
  const AMOUNT_PROVIDERS_INSERTED = 1;

  withData(
    {
      _1_basic: [0, DATA_TYPE_INDEX, undefined, false],
      _2_notSigner: [
        2,
        DATA_TYPE_INDEX,
        'SignerRole: caller does not have the Signer role',
        true,
      ],
    },
    function (senderIndex, dataTypeIndex, expectedErrorMessage, mustFail) {
      it(
        t(
          'user',
          'addDataProvider#1',
          'Should (or not) be able to add a data provider.',
          mustFail
        ),
        async function () {
          // Setup
          const sender = accounts[senderIndex];
          const dataProviderContract = await Mock.new();
          const dataProvider = dataProviderContract.address;
          try {
            // Invocation
            const result = await instance.addDataProvider(dataTypeIndex, dataProvider, {
              from: sender,
            });

            // Validating state variables were modified
            const aDataProvider = await instance.getDataProvider(
              dataTypeIndex,
              DATA_PROVIDER_INDEX
            );
            assert.equal(aDataProvider, dataProvider);

            // Assertions
            assert(!mustFail, 'It should have failed because data is invalid.');
            assert(result);

            // Validating events were emitted
            atmGovernance
              .dataProviderAdded(result)
              .emitted(sender, dataTypeIndex, AMOUNT_PROVIDERS_INSERTED, dataProvider);
          } catch (error) {
            // Assertions
            assert(mustFail);
            assert(error);
            assert.equal(error.reason, expectedErrorMessage);
          }
        }
      );
    }
  );

  withData(
    {
      _1_notContrat: [0, DATA_TYPE_INDEX, 2, 'DATA_PROVIDER_MUST_BE_A_CONTRACT', true],
    },
    function (
      senderIndex,
      dataTypeIndex,
      dataProviderIndex,
      expectedErrorMessage,
      mustFail
    ) {
      it(
        t(
          'user',
          'addDataProvider#2',
          'Should not be able to add non-contract addresses as data providers.',
          mustFail
        ),
        async function () {
          // Setup
          const sender = accounts[senderIndex];
          const dataProvider = accounts[dataProviderIndex];
          try {
            // Invocation
            const result = await instance.addDataProvider(dataTypeIndex, dataProvider, {
              from: sender,
            });

            // Assertions
            assert(!mustFail, 'It should have failed because data is invalid.');
            assert(result);
          } catch (error) {
            // Assertions
            assert(mustFail);
            assert(error);
            assert.equal(error.reason, expectedErrorMessage);
          }
        }
      );
    }
  );
});
