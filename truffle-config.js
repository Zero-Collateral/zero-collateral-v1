const envConfig = require('./config/env')();
const preamble = require('./docs/preamble');

// Environment Configuration
const addressCountValue = envConfig.getAddressCount().getOrDefault();
const mnemonicKeyValue = envConfig.getMnemonic().get();
const infuraKeyValue = envConfig.getInfuraKey().get();
const gasKeyValue = envConfig.getGasWei().getOrDefault();
const gasPriceKeyValue = envConfig.getGasPriceGwei().getOrDefault();
const defaultAddressIndex = envConfig.getDefaultAddressIndex().getOrDefault();
const etherscanApiKey = envConfig.getEtherscanApiKey().get();
const ganacheConfig = {
	host: envConfig.getGanacheHost().getOrDefault(),
	port: envConfig.getGanachePort().getOrDefault(),
	networkId: envConfig.getGanacheNetworkId().getOrDefault(),
	gasPrice: envConfig.getGanacheGasPrice().getOrDefault(),
};

const Web3 = require('web3');

const web3 = new Web3();
const HDWalletProvider = require('truffle-hdwallet-provider');

module.exports = {
	web3: Web3,
	plugins: [
		'solidity-coverage',
		'truffle-plugin-verify',
	],
	api_keys: {
		etherscan: etherscanApiKey,
	},
	verify: {
		preamble,
	},
	mocha: {
		enableTimeouts: false,
		reporter: 'eth-gas-reporter',
		reporterOptions : {
			currency: 'USD',
			showTimeSpent: true,
			excludeContracts: [
				'Migrations',
				'ERC20Mock',
				'DAIMock',
				'USDCMock',
				'LINKMock',
				'LendersMock',
				'LendersModifiersMock',
				'Mock',
				'EtherCollateralLoansMock',
				'TokenCollateralLoansMock',
				'LoansBaseMock',
				'LendingPoolMock',
				'InitializableModifiersMock',
				'InterestConsensusMock',
				'NumbersListMock',
				'BaseMock',
				'ConsensusMock',
				'ConsensusModifiersMock',
				'LoanTermsConsensusMock',
				'LoansBaseModifiersMock',
				'PairAggregatorMock'
			]
		},
	},
	compilers: {
		solc: {
			version: "0.5.17",
			optimizer: {
				enabled: true,
				runs: 200
			}
		}
	},
	networks: {
		ganache: {
			host: ganacheConfig.host,
			port: ganacheConfig.port,
			network_id: ganacheConfig.networkId,
			gas: gasKeyValue,
			gasPrice: ganacheConfig.gasPrice,
			skipDryRun: true,
		},
		ropsten: {
			provider: function() {
				return new HDWalletProvider(
					mnemonicKeyValue,
					`https://ropsten.infura.io/v3/${infuraKeyValue}`,
					defaultAddressIndex,
					addressCountValue
				);
			},
			gas: gasKeyValue,
			gasPrice: web3.utils.toWei(gasPriceKeyValue, 'gwei'),
			network_id: '3',
			skipDryRun: true,
		},
	}
}
