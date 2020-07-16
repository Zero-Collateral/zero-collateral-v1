module.exports = {
    network: 'test',
    chainlink: require('./chainlink'),
    compound: require('./compound'),
    tokens: require('./tokens'),
    maxGasLimit: 6000000,
    toTxUrl: ({ tx }) => {
        return `not-supported-url`;
    },
};
