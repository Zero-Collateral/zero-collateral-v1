const ZERO_COLLATERAL_KEY = 'zerocollateral';
const ETH = 'ETH';
const LINK = 'LINK';

const internalLoans = (collateralToken, tokenName, artifactName = 'Loans') => {
    return {
        keyName: ZERO_COLLATERAL_KEY,
        contractName: `${collateralToken.toUpperCase()}_Loans_z${tokenName.toUpperCase()}`,
        artifactName,
    }
};
const internalOracle = (sourceToken, targetToken, artifactName = 'ChainlinkPairAggregator') => {
    return {
        keyName: ZERO_COLLATERAL_KEY,
        contractName: `ChainlinkPairAggregator_${sourceToken.toUpperCase()}_${targetToken.toUpperCase()}`,
        artifactName,
    };
};
const internalLendingPool = (collateralToken, tokenName, artifactName = 'LendingPool') => {
    return {
        keyName: ZERO_COLLATERAL_KEY,
        contractName: `${collateralToken.toUpperCase()}_LendingPool_z${tokenName.toUpperCase()}`,
        artifactName,
    };
};
const internalInterestConsensus = (collateralToken, tokenName, artifactName = 'InterestConsensus') => {
    return {
        keyName: ZERO_COLLATERAL_KEY,
        contractName: `${collateralToken.toUpperCase()}_InterestConsensus_z${tokenName.toUpperCase()}`,
        artifactName,
    };
};
const internalLoanTermsConsensus = (collateralToken, tokenName, artifactName = 'LoanTermsConsensus') => {
    return {
        keyName: ZERO_COLLATERAL_KEY,
        contractName: `${collateralToken.toUpperCase()}_LoanTermsConsensus_z${tokenName.toUpperCase()}`,
        artifactName,
    };
};
const internalLenders = (collateralToken, tokenName, artifactName = 'Lenders') => {
    return {
        keyName: ZERO_COLLATERAL_KEY,
        contractName: `${collateralToken.toUpperCase()}_Lenders_z${tokenName.toUpperCase()}`,
        artifactName,
    };
};
const ztoken = (tokenName) => {
    return {
        keyName: ZERO_COLLATERAL_KEY,
        contractName: `Z${tokenName.toUpperCase()}`,
        artifactName: undefined,
    };
};
const internalChainlink = (sourceTokenName, targetTokenName, artifactName = 'PairAggregatorMock') => {
    return {
        addressOnProperty: 'address',
        keyName: 'chainlink',
        contractName: `${sourceTokenName.toUpperCase()}_${targetTokenName.toUpperCase()}`,
        artifactName,
    };
};

const customCollateralToken = (collateralToken) => {
    const collToken = collateralToken.toUpperCase();
    const loansArtifactName = collToken === ETH ? 'EtherCollateralLoans' : 'TokenCollateralLoans';
    return {
        loans: (tokenName) => {
            return internalLoans(collToken, tokenName, loansArtifactName);
        },
        lendingPool: (tokenName, artifactName = 'LendingPool') => {
            return internalLendingPool(collToken, tokenName, artifactName);
        },
        interestConsensus: (tokenName, artifactName = 'LendingPool') => {
            return internalInterestConsensus(collToken, tokenName, artifactName);
        },
        loanTermsConsensus: (tokenName, artifactName = 'LoanTermsConsensus') => {
            return internalLoanTermsConsensus(collToken, tokenName, artifactName);
        },
        lenders: (tokenName, artifactName = 'Lenders') => {
            return internalLenders(collToken, tokenName, artifactName);
        },
        chainlink: {
            usdc_eth: () => internalChainlink('USDC', collToken),
            dai_eth: () => internalChainlink('DAI', collToken),
            custom: (tokenName) => internalChainlink(tokenName.toUpperCase(), collToken),
        }
    };
}
module.exports = {
    zerocollateral: {
        ztoken,
        eth: () => customCollateralToken(ETH),
        link: () => customCollateralToken(LINK),
        custom: (collateralToken) => customCollateralToken(collateralToken),
        oracles: () => ({
            usdc_eth: () => internalOracle('USDC', 'ETH'),
            dai_eth: () => internalOracle('DAI', 'ETH'),
            usdc_link: () => internalOracle('USDC', 'LINK'),
            dai_link: () => internalOracle('DAI', 'LINK'),
            custom: (sourceTokenName, targetTokenName) =>
                internalOracle(sourceTokenName.toUpperCase(), targetTokenName.toUpperCase()),
        }),
        settings: () => {
            return {
                keyName: ZERO_COLLATERAL_KEY,
                contractName: 'Settings',
                artifactName: undefined,
            };
        }
    },
    tokens: {
        get: (tokenName, artifactName = 'ERC20Mock') => {
            return {
                keyName: 'tokens',
                contractName: tokenName.toUpperCase(),
                artifactName,
            };
        },
    },
    ctokens: {
        get: (tokenName, artifactName = 'CErc20Interface') => {
            return {
                keyName: 'compound',
                contractName: tokenName.toUpperCase(),
                artifactName,
            };
        },
    },
    chainlink: {
        custom: (sourceTokenName, targetTokenName) =>
            internalChainlink(sourceTokenName.toUpperCase(), targetTokenName.toUpperCase()),
    }
};