// JS Libraries
const withData = require('leche').withData;
const { t, NULL_ADDRESS } = require('../utils/consts');
const { createTestSettingsInstance } = require('../utils/settings-helper');
const { settings } = require('../utils/events');

// Mock contracts
const Mock = artifacts.require('./mock/util/Mock.sol');

// Smart contracts
const Settings = artifacts.require('./base/Settings.sol');

contract('SettingsUnpauseLendingPoolTest', function (accounts) {
  const owner = accounts[0];
  let instance;

  beforeEach('Setup for each test', async () => {
    instance = await createTestSettingsInstance(Settings, { from: owner, Mock });
  });

  withData(
    {
      _1_basic: [0, 1, undefined, false],
      _2_notOwner: [2, 3, 'NOT_PAUSER', true],
      _3_emptyLendingPool: [0, -1, 'LENDING_POOL_IS_REQUIRED', true],
    },
    function (senderIndex, lendingPoolIndex, expectedErrorMessage, mustFail) {
      it(
        t(
          'user',
          'unpauseLendingPool',
          'Should (or not) be able to pause a lending pool.',
          mustFail
        ),
        async function () {
          // Setup
          const lendingPool =
            lendingPoolIndex === -1 ? NULL_ADDRESS : accounts[lendingPoolIndex];
          const sender = accounts[senderIndex];
          if (lendingPool !== NULL_ADDRESS) {
            await instance.pauseLendingPool(lendingPool, { from: owner });
          }

          try {
            // Invocation
            const result = await instance.unpauseLendingPool(lendingPool, {
              from: sender,
            });

            // Assertions
            assert(!mustFail, 'It should have failed because data is invalid.');
            assert(result);

            const isLendingPoolPaused = await instance.lendingPoolPaused(lendingPool);
            assert(!isLendingPoolPaused, 'Lending pool should be unpaused.');

            settings.lendingPoolUnpaused(result).emitted(sender, lendingPool);
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
      _1_notPausedTwice: [0, 1],
    },
    function (senderIndex, lendingPoolIndex) {
      it(
        t(
          'user',
          'unpauseLendingPool',
          'Should NOT be able to unpause a lending pool twice.',
          true
        ),
        async function () {
          // Setup
          const lendingPool = accounts[lendingPoolIndex];
          const sender = accounts[senderIndex];
          await instance.pauseLendingPool(lendingPool, { from: sender });
          await instance.unpauseLendingPool(lendingPool, { from: sender });

          try {
            // Invocation
            await instance.unpauseLendingPool(lendingPool, { from: sender });

            // Assertions
            fail('It should have failed because data is invalid.');
          } catch (error) {
            // Assertions
            assert(error);
            assert.equal(error.reason, 'LENDING_POOL_IS_NOT_PAUSED');
          }
        }
      );
    }
  );
});
