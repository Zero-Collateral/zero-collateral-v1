// JS Libraries
const withData = require('leche').withData;
const { t, NULL_ADDRESS, toDecimals } = require('../utils/consts');
const { createAssetSettings } = require('../utils/asset-settings-helper');
const { settings } = require('../utils/events');
const { createTestSettingsInstance } = require('../utils/settings-helper');
const CTokenInterfaceEncoder = require('../utils/encoders/CTokenInterfaceEncoder');

// Mock contracts
const Mock = artifacts.require('./mock/util/Mock.sol');

// Smart contracts
const Settings = artifacts.require('./base/Settings.sol');

contract('SettingsRemoveAssetSettingsTest', function (accounts) {
  const cTokenEncoder = new CTokenInterfaceEncoder(web3);

  let owner = accounts[0];
  let assetInstance;
  let cTokenInstance;

  beforeEach('Setup for each test', async () => {
    assetInstance = await Mock.new();
    cTokenInstance = await Mock.new();
    await cTokenInstance.givenMethodReturnAddress(
      cTokenEncoder.encodeUnderlying(),
      assetInstance.address
    );
  });

  const getSenderAddress = (addressIndex) => {
    return addressIndex === -1 ? NULL_ADDRESS : accounts[addressIndex];
  };

  withData(
    {
      _1_valid_with1PreviousAssets_remove: [
        [{ maxLoanAmount: toDecimals(100, 18) }],
        false,
        false,
        0,
        0,
        undefined,
        false,
      ],
      _2_valid_with2PreviousAssets_remove: [
        [{ maxLoanAmount: toDecimals(900, 18) }, { maxLoanAmount: toDecimals(1000, 18) }],
        false,
        false,
        0,
        1,
        undefined,
        false,
      ],
      _3_invalid_not_owner: [
        [{ maxLoanAmount: toDecimals(900, 18) }, { maxLoanAmount: toDecimals(1000, 18) }],
        false,
        false,
        1,
        1,
        'NOT_PAUSER',
        true,
      ],
      _4_valid_with3PreviousAssets_remove: [
        [
          { maxLoanAmount: toDecimals(900, 18) },
          { maxLoanAmount: toDecimals(1000, 18) },
          { maxLoanAmount: toDecimals(2000, 18) },
        ],
        false,
        false,
        0,
        1,
        undefined,
        false,
      ],
      // We should able to remove/create/update an asset settings when platform is paused.
      _5_platform_paused: [
        [{ maxLoanAmount: toDecimals(900, 18) }, { maxLoanAmount: toDecimals(1000, 18) }],
        true,
        false,
        0,
        1,
        undefined,
        false,
      ],
    },
    function (
      previousAssetsInfo,
      isPaused,
      addAsPauserRole,
      senderIndex,
      assetAddressIndex,
      expectedErrorMessage,
      mustFail
    ) {
      it(
        t(
          'user',
          'removeAssetSettings',
          'Should (or not) be able to remove a asset setting.',
          mustFail
        ),
        async function () {
          // Setup
          const instance = await createTestSettingsInstance(Settings, {
            from: owner,
            Mock,
          });

          const senderAddress = getSenderAddress(senderIndex);
          if (addAsPauserRole) {
            await instance.addPauser(senderAddress, { from: owner });
          }
          const currentAssetsInfo = await createAssetSettings(
            Mock,
            instance,
            owner,
            previousAssetsInfo
          );
          const assetAddress =
            assetAddressIndex === -1
              ? NULL_ADDRESS
              : currentAssetsInfo[assetAddressIndex].assetAddress;

          const beforeAssets = await instance.getAssets();

          if (isPaused) {
            await instance.pause({ from: owner });
          }

          try {
            // Invocation
            const result = await instance.removeAssetSettings(assetAddress, {
              from: senderAddress,
            });

            // Assertions
            assert(!mustFail, 'It should have failed because data is invalid.');
            assert(result);

            settings.assetSettingsRemoved(result).emitted(senderAddress, assetAddress);

            const assetSettingsResult = await instance.getAssetSettings(assetAddress);
            assert.equal(assetSettingsResult.cTokenAddress.toString(), NULL_ADDRESS);
            assert.equal(assetSettingsResult.maxLoanAmount.toString(), '0');

            const afterAssets = await instance.getAssets();
            assert.equal(afterAssets.length, beforeAssets.length - 1);
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
