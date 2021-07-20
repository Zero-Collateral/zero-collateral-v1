import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import '@tenderly/hardhat-tenderly'
import 'hardhat-contract-sizer'
import 'hardhat-deploy'
import 'hardhat-gas-reporter'

import { config } from 'dotenv'
import { BigNumber as BN, ethers } from 'ethers'
import fs from 'fs'
import { HardhatUserConfig } from 'hardhat/config'
import {
  HardhatNetworkHDAccountsUserConfig,
  HardhatNetworkUserConfig,
  NetworkUserConfig,
} from 'hardhat/types'
import { EthGasReporterConfig, RemoteContract } from "hardhat-gas-reporter/src/types"
import path from 'path'

config()

const {
  ALCHEMY_KOVAN_KEY,
  ALCHEMY_RINKEBY_KEY,
  ALCHEMY_ROPSTEN_KEY,
  ALCHEMY_MAINNET_KEY,
  COMPILING,
  CMC_KEY,
  ETHERSCAN_API_KEY,
  GAS_PRICE_GWEI_KEY,
  INFURA_KEY,
  FORKING_NETWORK,
  MATIC_MAINNET_KEY,
  MATIC_MUMBAI_KEY,
  MNEMONIC_KEY,
  SAVE_GAS_REPORT,
} = process.env

if (COMPILING != 'true') {
  require('./tasks')
  require('./utils/hre-extensions')
}

const accounts: HardhatNetworkHDAccountsUserConfig = {
  mnemonic: MNEMONIC_KEY,
  count: 15,
  accountsBalance: ethers.utils.parseEther('100000000').toString(),
}

const GAS: HardhatNetworkUserConfig['gas'] = 'auto'

const GAS_PRICE: HardhatNetworkUserConfig['gasPrice'] = GAS_PRICE_GWEI_KEY
  ? BN.from(ethers.utils.parseUnits(GAS_PRICE_GWEI_KEY, 'gwei')).toNumber()
  : 'auto'

const networkUrls: { [network: string]: string } = {
  kovan: ALCHEMY_KOVAN_KEY!,
  rinkeby: ALCHEMY_RINKEBY_KEY!,
  ropsten: ALCHEMY_ROPSTEN_KEY!,
  mainnet: ALCHEMY_MAINNET_KEY!,
  polygon: MATIC_MAINNET_KEY!,
  polygon_mumbai: MATIC_MUMBAI_KEY!,
}

const getLatestDeploymentBlock = (networkName: string): number | undefined => {
  try {
    return parseInt(
      fs
        .readFileSync(
          path.resolve(
            __dirname,
            'deployments',
            networkName,
            '.latestDeploymentBlock'
          )
        )
        .toString()
    )
  } catch {
    // Network deployment does not exist
  }
}

const networkConfig = (config: NetworkUserConfig): NetworkUserConfig => {
  config = {
    ...config,
    accounts,
    gas: GAS,
    gasPrice: config.live
      ? GAS_PRICE
      : GAS_PRICE === 'auto'
      ? GAS_PRICE
      : BN.from(GAS_PRICE).div(4).toNumber(),
  }

  return config
}


const getRemoteContracts = (networkType:string) : RemoteContract[] => {

  const remoteContracts:RemoteContract[] = []
  
  const preCompilesPath = `deployments/${networkType.toLowerCase()}`
  for (const fileName of fs.readdirSync(preCompilesPath)){
    const artifactPath = path.join(process.cwd(), preCompilesPath, fileName) 
     
    if(fileName.startsWith('.') || !fileName.endsWith('.json'))continue

    try{ 

    const preDeployed =  JSON.parse( fs.readFileSync(artifactPath, 'utf8' ) )
     
    if (preDeployed.address){
      remoteContracts.push({
        name: preDeployed.artifactName,
        abi: preDeployed.abi,
        address: preDeployed.address
      })
    } 

    }catch(e){
      console.error('Could not parse artifact file: ',e)
    }

  //console.log('preDeployed',preDeployed.artifactName)

  }

  return remoteContracts
}




// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export default <HardhatUserConfig>{
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  tenderly: {
    username: 'soltel',
    project: 'mumbai',
  },
  paths: {
    sources: 'contracts',
  },
  external: {
    contracts: [
      {
        artifacts: 'node_modules/hardhat-deploy/extendedArtifacts',
      },
      {
        artifacts: 'node_modules/@openzeppelin/contracts/build/contracts',
      },
    ],
  },
  solidity: {
    compilers: [
      {
        version: '0.8.4',
        settings: {
          optimizer: {
            enabled: process.env.TESTING !== '1',
            runs: 200,
          },
        },
      },
    ],
  },
  contractSizer: {
    runOnCompile: !!COMPILING,
    alphaSort: false,
    disambiguatePaths: false,
  },
  gasReporter: {
    enabled: true, //enabled: (process.env.REPORT_GAS) ? true : false
    currency: 'USD',
    coinmarketcap: CMC_KEY,
    outputFile: SAVE_GAS_REPORT ? 'gas-reporter.txt' : undefined,
    noColors: !!SAVE_GAS_REPORT,
    showMethodSig: false,
    showTimeSpent: true,
    onlyCalledMethods: false,
   // remoteContracts: getRemoteContracts('hardhat')
  },
  namedAccounts: {
    deployer: '0xAFe87013dc96edE1E116a288D80FcaA0eFFE5fe5',
    lender: {
      hardhat: 5,
      localhost: 5,
    },
    lender2: {
      hardhat: 6,
      localhost: 6,
    },
    borrower: {
      hardhat: 7,
      localhost: 7,
    },
    liquidator: {
      hardhat: 9,
      localhost: 9,
    },
    funder: {
      hardhat: 14,
      localhost: 14,
    },
    craSigner: {
      hardhat: 10,
      localhost: 10,
    },
  },
  networks: {
    kovan: networkConfig({
      url: networkUrls.kovan,
      chainId: 42,
      live: true,
    }),
    rinkeby: networkConfig({
      url: networkUrls.rinkeby,
      chainId: 4,
      live: true,
    }),
    ropsten: networkConfig({
      url: networkUrls.ropsten,
      chainId: 3,
      live: true,
    }),
    mainnet: networkConfig({
      url: networkUrls.mainnet,
      chainId: 1,
      live: true,
    }),
    polygon: networkConfig({
      url: networkUrls.polygon,
      chainId: 137,
      live: true,
    }),
    polygon_mumbai: networkConfig({
      url: networkUrls.polygon_mumbai,
      chainId: 80001,
      live: true,
    }),
    hardhat: networkConfig({
      chainId: 31337,
      live: false,
      forking:
        FORKING_NETWORK == null
          ? undefined
          : {
              enabled: true,
              url: networkUrls[FORKING_NETWORK],
              blockNumber: getLatestDeploymentBlock(FORKING_NETWORK),
            },
    }),
    localhost: networkConfig({
      url: 'http://127.0.0.1:8545',
      timeout: 10000000,
    }),
  },
  mocha: {
    timeout: 10000000,
  },
}
