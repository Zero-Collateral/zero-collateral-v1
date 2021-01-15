const { encode } = require('../consts');

class CTokenInterfaceEncoder {
  constructor(web3) {
    this.web3 = web3;
    assert(web3, 'Web3 instance is required.');
  }
}

CTokenInterfaceEncoder.prototype.encodeUnderlying = function () {
  return encode(this.web3, 'underlying()');
};

CTokenInterfaceEncoder.prototype.encodeExchangeRateStored = function () {
  return encode(this.web3, 'exchangeRateStored()');
};

CTokenInterfaceEncoder.prototype.encodeDecimals = function () {
  return encode(this.web3, 'decimals()');
};

module.exports = CTokenInterfaceEncoder;
