import { DeployFunction } from 'hardhat-deploy/types'

import { getNetworkName } from '../config'
import {
  ITellerNFT,
  ITellerNFTDistributor,
  PolyTellerNFT,
} from '../types/typechain'
import { TellerNFTDictionary } from '../types/typechain'
import {
  deploy,
  deployDiamond,
  DeployDiamondArgs,
} from '../utils/deploy-helpers'

const deployNFT: DeployFunction = async (hre) => {
  const { getNamedSigner, run, log, network, contracts, ethers } = hre
  const deployer = await getNamedSigner('deployer')
  const networkName = getNetworkName(network)
  // Make sure contracts are compiled
  await run('compile')

  log('')
  log('********** Teller NFT **********', { indent: 1 })
  log('')

  const nft = await deploy<ITellerNFT>({
    contract: 'TellerNFT',
    hre,
  })

  const nftDictionary = await deploy<TellerNFTDictionary>({
    contract: 'TellerNFTDictionary',
    hre,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [await deployer.getAddress()],
        },
      },
    },
  })

  if (networkName === 'polygon' || networkName === 'polygon_mumbai') {
    const polyTellerNft = await deploy<PolyTellerNFT>({
      contract: 'PolyTellerNFT',
      hre,
      proxy: {
        proxyContract: 'OpenZeppelinTransparentProxy',
        execute: {
          init: {
            methodName: 'initialize',
            args: [[await deployer.getAddress()]],
          },
        },
      },
    })
  }

  //call initialize on the dictionary

  let execute: DeployDiamondArgs<ITellerNFTDistributor, any>['execute']
  try {
    // Try to get deployment of TellerDiamond
    await contracts.get('TellerNFTDistributor')

    // If deployment exists execute upgrade function
    const executeMethod = undefined
    const upgradeExecute: DeployDiamondArgs<
      ITellerNFTDistributor,
      typeof executeMethod
    >['execute'] = undefined

    execute = upgradeExecute
  } catch {
    const executeMethod = 'initialize'
    const initExecute: DeployDiamondArgs<
      ITellerNFTDistributor,
      typeof executeMethod
    >['execute'] = {
      methodName: executeMethod,
      args: [nft.address, nftDictionary.address, await deployer.getAddress()],
    }

    execute = initExecute
  }

  const nftDistributor = await deployDiamond<ITellerNFTDistributor, any>({
    name: 'TellerNFTDistributor',
    facets: [
      {
        contract: 'ent_initialize_NFTDistributor_v1',
        skipIfAlreadyDeployed: true,
      },
      {
        contract: 'ent_addMerkle_NFTDistributor_v1',
        skipIfAlreadyDeployed: true,
      },
      {
        contract: 'ent_moveMerkle_NFTDistributor_v1',
        skipIfAlreadyDeployed: true,
      },
      { contract: 'ent_claim_NFTDistributor_v1', skipIfAlreadyDeployed: false },
      { contract: 'ext_distributor_NFT_v1', skipIfAlreadyDeployed: true },
    ],
    hre,
    execute,
  })

  const adminRole = ethers.utils.id('ADMIN')
  const distributorIsDictAdmin = await nftDictionary.hasRole(
    adminRole,
    nftDistributor.address
  )
  if (!distributorIsDictAdmin) {
    log(
      `Adding distributor ${await deployer.getAddress()} as ADMIN for Dictionary...: `,
      { indent: 2, star: true, nl: false }
    )

    await nftDictionary
      .connect(deployer)
      .grantRole(adminRole, nftDistributor.address)
      .then(({ wait }) => wait())

    log('Done.')
  }

  log('Initializing Teller NFT...:', { indent: 2, star: true, nl: false })

  try {
    const minters: string[] = [
      nftDistributor.address,
      await deployer.getAddress(),
    ]
    const receipt = await nft
      .initialize(minters)
      .then(async ({ wait }) => await wait())
    log(` with ${receipt.gasUsed} gas`)
  } catch (err) {
    log(' already initialized')
  }

  await run('add-nft-tiers', { sendTx: true })
  await run('add-nft-merkles', { sendTx: true })
}

deployNFT.tags = ['nft']
deployNFT.dependencies = ['setup']

export default deployNFT
