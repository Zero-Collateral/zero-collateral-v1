const { encode } = require('../consts');

class SettingsInterfaceEncoder {
  constructor(web3) {
    this.web3 = web3;
    assert(web3, 'Web3 instance is required.');
  }
}

SettingsInterfaceEncoder.prototype.encodeGetPlatformSettingValue = function () {
  return encode(this.web3, 'getPlatformSettingValue(bytes32)');
};

SettingsInterfaceEncoder.prototype.encodeHasPauserRole = function () {
  return encode(this.web3, 'hasPauserRole(address)');
};

SettingsInterfaceEncoder.prototype.encodeRequirePauserRole = function () {
  return encode(this.web3, 'requirePauserRole(address)');
};

SettingsInterfaceEncoder.prototype.encodeIsPaused = function () {
  return encode(this.web3, 'isPaused()');
};

SettingsInterfaceEncoder.prototype.encodeIsPoolPaused = function () {
  return encode(this.web3, 'isPoolPaused(address)');
};

SettingsInterfaceEncoder.prototype.encodeEscrowFactory = function () {
  return encode(this.web3, 'escrowFactory()');
};

SettingsInterfaceEncoder.prototype.encodeETH_ADDRESS = function () {
  return encode(this.web3, 'ETH_ADDRESS()');
};

SettingsInterfaceEncoder.prototype.encodeATMSettings = function () {
  return encode(this.web3, 'atmSettings()');
};

SettingsInterfaceEncoder.prototype.encodeVersionsRegistry = function () {
  return encode(this.web3, 'versionsRegistry()');
};

SettingsInterfaceEncoder.prototype.encodeInterestValidator = function () {
  return encode(this.web3, 'interestValidator()');
};

SettingsInterfaceEncoder.prototype.encodeGetAssetSettings = function () {
  return encode(this.web3, 'getAssetSettings(address)');
};

SettingsInterfaceEncoder.prototype.encodeGetCTokenAddress = function () {
  return encode(this.web3, 'getCTokenAddress(address)');
};

module.exports = SettingsInterfaceEncoder;
