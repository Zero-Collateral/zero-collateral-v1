import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import { getDappAddresses, getNativeToken, getNetworkName } from '../config'
import {
  ICollateralEscrow,
  ILoansEscrow,
  ITellerDiamond,
  ITToken,
  UpgradeableBeaconFactory,
} from '../types/typechain'
import {
  deploy,
  deployDiamond,
  DeployDiamondArgs,
  Facets,
} from '../utils/deploy-helpers'

const deployProtocol: DeployFunction = async (hre) => {
  const { contracts, network, getNamedAccounts, log } = hre
  const { deployer } = await getNamedAccounts()
  const networkName = getNetworkName(network)

  log('********** Teller Diamond **********', { indent: 1 })

  const { address: nftAddress } = await contracts.get('TellerNFT')
  const loansEscrowBeacon = await deployLoansEscrowBeacon(hre)
  const collateralEscrowBeacon = await deployCollateralEscrowBeacon(hre)
  const tTokenBeacon = await deployTTokenBeacon(hre)
  const nftDictionary = await contracts.get('TellerNFTDictionary')
  const priceAggregator = await contracts.get('PriceAggregator')

  const wrappedNativeToken = getNativeToken(network)
  const dappAddresses = getDappAddresses(network)

  let execute: DeployDiamondArgs<ITellerDiamond, any>['execute']

  try {
    // Try to get deployment of TellerDiamond
    await contracts.get('TellerDiamond')

    // If deployment exists execute upgrade function
    const executeMethod = 'setPriceAggregator'
    const upgradeExecute = {
      methodName: executeMethod,
      args: [priceAggregator.address],
    }

    execute = upgradeExecute
  } catch {
    // Else execute initialize function
    const executeMethod = 'init'
    const initExecute: DeployDiamondArgs<
      ITellerDiamond,
      typeof executeMethod
    >['execute'] = {
      methodName: executeMethod,
      args: [
        {
          admin: deployer,
          tellerNFT: nftAddress,
          loansEscrowBeacon: loansEscrowBeacon.address,
          collateralEscrowBeacon: collateralEscrowBeacon.address,
          tTokenBeacon: tTokenBeacon.address,
          // Teller Gnosis Safe contract
          nftLiquidationController:
            '0x95143890162bd671d77ae9b771881a1cb76c29a4',
          wrappedNativeToken: wrappedNativeToken,
          nftDictionary: nftDictionary.address,
          priceAggregator: priceAggregator.address,
        },
      ],
    }

    execute = initExecute
  }

  // Deploy platform diamond
  const facets: Facets = [
    // Settings
    {
      contract: 'SettingsFacet',
      skipIfAlreadyDeployed: false,
    },
    {
      contract: 'PlatformSettingsFacet',
      skipIfAlreadyDeployed: false,
    },
    {
      contract: 'AssetSettingsDataFacet',
      skipIfAlreadyDeployed: false,
    },
    {
      contract: 'AssetSettingsFacet',
      skipIfAlreadyDeployed: false,
    },
    {
      contract: 'PausableFacet',
      skipIfAlreadyDeployed: false,
    },
    // Pricing
    {
      contract: 'PriceAggFacet',
      skipIfAlreadyDeployed: false,
    },
    // Lending
    {
      contract: 'LendingFacet',
      skipIfAlreadyDeployed: false,
    },
    // Loans
    {
      contract: 'CollateralFacet',
      skipIfAlreadyDeployed: false,
    },
    {
      contract: 'CreateLoanFacet',
      skipIfAlreadyDeployed: false,
    },
    {
      contract: 'LoanDataFacet',
      skipIfAlreadyDeployed: false,
    },
    {
      contract: 'RepayFacet',
      skipIfAlreadyDeployed: false,
    },
    {
      contract: 'SignersFacet',
      skipIfAlreadyDeployed: false,
    },
    // NFT
    {
      contract: 'NFTFacet',
      skipIfAlreadyDeployed: false,
    },
    // Dapps
    {
      contract: 'AaveFacet',
      skipIfAlreadyDeployed: false,
      args: [dappAddresses.aaveLendingPoolAddressProvider],
    },
    {
      contract: 'YearnFacet',
      skipIfAlreadyDeployed: false,
    },
    {
      contract: 'PoolTogetherFacet',
      skipIfAlreadyDeployed: false,
    },
  ]

  // Network specify Facets
  switch (networkName) {
    case 'mainnet':
    case 'kovan':
    case 'rinkeby':
    case 'ropsten':
      facets.push(
        // Dapps
        {
          contract: 'UniswapFacet',
          skipIfAlreadyDeployed: false,
          args: [dappAddresses.uniswapV2RouterAddress],
        },
        {
          contract: 'CompoundFacet',
          skipIfAlreadyDeployed: false,
        },
        {
          contract: 'CompoundClaimCompFacet',
          skipIfAlreadyDeployed: false,
          args: [dappAddresses.compoundComptrollerAddress],
        }
      )

      break

    case 'polygon':
    case 'polygon_mumbai':
    case 'localhost':
    case 'hardhat':
      facets.push(
        // Dapps
        {
          contract: 'SushiswapFacet',
          skipIfAlreadyDeployed: false,
          args: [dappAddresses.sushiswapV2RouterAddress],
        }
      )

      break
  }

  const tellerDiamondArgs: DeployDiamondArgs<ITellerDiamond, any> = {
    hre,
    name: 'TellerDiamond',
    facets,
    owner: deployer,
    execute,
  }
  const diamond = await deployDiamond<ITellerDiamond, any>(tellerDiamondArgs)

  await addAuthorizedAddresses(hre, diamond)
}

const addAuthorizedAddresses = async (
  hre: HardhatRuntimeEnvironment,
  diamond: ITellerDiamond
): Promise<void> => {
  const { getNamedSigner, getNamedAccounts, network } = hre

  const addresses = new Set([
    '0xAFe87013dc96edE1E116a288D80FcaA0eFFE5fe5', // - deployer
    '0xd59e99927018b995ee9Ad6b9003677f1e7393F8A', // - noah
    '0xa243A7b4e9AF8D7e87a5443Aa7E21AB27624eaaA', // - ryry
    '0x592000b2c8c590531d490893C16AfC4b9cbbe6B9', // - ryry
    '0xd965Cd540d2B80e7ef2840Ff097016B3A0e930fC', // - jer
    '0xb8fAF03a268F259dDD9adfAf8E1148Fc81021e54', // - sy
    '0xc756Be144729EcDBE51f49073D295ABd318f0048', // - tan
  ])
  if (network.name === 'mainnet') {
  } else if (network.name === 'hardhat' || network.name === 'localhost') {
    const accounts = await getNamedAccounts()
    addresses.add(accounts.lender)
    addresses.add(accounts.borrower)
    addresses.add(accounts.liquidator)
    addresses.add(accounts.funder)
  }

  // Check if addresses in list already have authorization
  const list: string[] = []
  for (const address of Array.from(addresses)) {
    const has = await diamond.hasAuthorization(address)
    if (!has) {
      list.push(address)
    }
  }

  if (list.length > 0)
    await diamond
      .connect(await getNamedSigner('deployer'))
      .addAuthorizedAddressList(list)
      .then(({ wait }) => wait())
}

const deployLoansEscrowBeacon = async (
  hre: HardhatRuntimeEnvironment
): Promise<UpgradeableBeaconFactory> => {
  const { getNamedSigner, ethers, log } = hre

  const deployer = await getNamedSigner('deployer')

  log('********** Loans Escrow Beacon **********', { indent: 2 })
  log('')

  const logicVersion = 1

  const loansEscrowLogic = await deploy<ILoansEscrow>({
    hre,
    contract: `LoansEscrow_V${logicVersion}`,
    indent: 3,
  })

  const beaconProxy = await deploy({
    hre,
    contract: 'InitializeableBeaconProxy',
    indent: 4,
  })

  const beacon = await deploy<UpgradeableBeaconFactory>({
    hre,
    contract: 'UpgradeableBeaconFactory',
    name: 'EscrowBeaconFactory',
    args: [beaconProxy.address, loansEscrowLogic.address],
    indent: 4,
  })

  // Check to see if we need to upgrade
  const currentImpl = await beacon.implementation()
  if (
    ethers.utils.getAddress(currentImpl) !==
    ethers.utils.getAddress(loansEscrowLogic.address)
  ) {
    log(`Upgrading Loans Escrow logic: ${loansEscrowLogic.address}`, {
      indent: 5,
      star: true,
    })
    await beacon
      .connect(deployer)
      .upgradeTo(loansEscrowLogic.address)
      .then(({ wait }) => wait())
  }

  log('')

  return beacon
}

const deployCollateralEscrowBeacon = async (
  hre: HardhatRuntimeEnvironment
): Promise<UpgradeableBeaconFactory> => {
  const { getNamedSigner, ethers, log } = hre

  const deployer = await getNamedSigner('deployer')

  log('********** Collateral Escrow Beacon **********', { indent: 2 })
  log('')

  const logicVersion = 1

  const collateralEscrowLogic = await deploy<ICollateralEscrow>({
    hre,
    contract: `CollateralEscrow_V${logicVersion}`,
    indent: 3,
  })

  const beaconProxy = await deploy({
    hre,
    contract: 'InitializeableBeaconProxy',
    indent: 4,
  })

  const beacon = await deploy<UpgradeableBeaconFactory>({
    hre,
    contract: 'UpgradeableBeaconFactory',
    name: 'CollateralEscrowBeaconFactory',
    args: [beaconProxy.address, collateralEscrowLogic.address],
    indent: 4,
  })

  // Check to see if we need to upgrade
  const currentImpl = await beacon.implementation()
  if (
    ethers.utils.getAddress(currentImpl) !==
    ethers.utils.getAddress(collateralEscrowLogic.address)
  ) {
    log(`Upgrading Collateral Escrow logic: ${collateralEscrowLogic.address}`, {
      indent: 5,
      star: true,
    })
    await beacon
      .connect(deployer)
      .upgradeTo(collateralEscrowLogic.address)
      .then(({ wait }) => wait())
  }

  log('')

  return beacon
}

const deployTTokenBeacon = async (
  hre: HardhatRuntimeEnvironment
): Promise<UpgradeableBeaconFactory> => {
  const { getNamedSigner, ethers, log } = hre

  const deployer = await getNamedSigner('deployer')

  log('********** Teller Token (TToken) Beacon **********', { indent: 2 })
  log('')

  const logicVersion = 2

  const tTokenLogic = await deploy<ITToken>({
    hre,
    contract: `TToken_V${logicVersion}`,
    indent: 3,
  })

  const beaconProxy = await deploy({
    hre,
    contract: 'InitializeableBeaconProxy',
    indent: 4,
  })

  const beacon = await deploy<UpgradeableBeaconFactory>({
    hre,
    contract: 'UpgradeableBeaconFactory',
    name: 'TTokenBeaconFactory',
    args: [beaconProxy.address, tTokenLogic.address],
    indent: 4,
  })

  // Check to see if we need to upgrade
  const currentImpl = await beacon.implementation()
  if (
    ethers.utils.getAddress(currentImpl) !==
    ethers.utils.getAddress(tTokenLogic.address)
  ) {
    log(`Upgrading Teller Token logic: ${tTokenLogic.address}`, {
      indent: 5,
      star: true,
    })
    await beacon
      .connect(deployer)
      .upgradeTo(tTokenLogic.address)
      .then(({ wait }) => wait())
  }

  log('')

  return beacon
}

deployProtocol.tags = ['protocol']
deployProtocol.dependencies = ['setup', 'nft', 'price-agg']

export default deployProtocol
