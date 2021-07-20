import colors from "colors"
import * as ethers from "ethers"
import { task } from "hardhat/config"
import { HardhatRuntimeEnvironment } from "hardhat/types"

import { getNFT } from "../../config"
import { ITellerNFT, TellerNFT, TellerNFTDictionary } from "../../types/typechain"
import { NULL_ADDRESS } from "../../utils/consts"

interface AddTiersArgs {
  sendTx?: boolean
}

export const addTiers = async (
  args: AddTiersArgs,
  hre: HardhatRuntimeEnvironment
): Promise<void> => {
  const { contracts, network, ethers, log, getNamedSigner } = hre

  if (!['localhost', 'hardhat'].includes(network.name) && !args.sendTx) {
    log('')
    log('================================================')
    log('  Must pass --send-tx flag to execute tx')
    log('================================================')
    log('')
    return
  }

  const nft = await contracts.get<ITellerNFT>('TellerNFT')
  if (!nft)
    throw new Error(
      `No deployment for Teller NFT. Please run the NFT deployment script.`
    )

  const nftDictionary = await contracts.get<TellerNFTDictionary>(
    'TellerNFTDictionary'
  )

  log('')
  log('Adding Tiers to Teller NFT', { indent: 2, star: true })

  const deployer = await getNamedSigner('deployer')
  const { tiers } = getNFT(network)
  for (let i = 0; i < tiers.length; i++) {
    const cAsset = await nftDictionary.contributionAssets(i)

    // Add Tier information
    if (cAsset === NULL_ADDRESS) {
      log(`Creating Tier ${i} in Dictionary... `, {
        indent: 3,
        star: true,
        nl: false,
      })

      await nftDictionary
        .connect(deployer)
        .setTier(i, tiers[i])
        .then(({ wait }) => wait())

      log(`done.`)
    } else {
      log(`Tier ${i} already exists in NFTDictionary`, {
        indent: 3,
        star: true,
      })
    }
  }

  log('')
  log(`Setting NFT token tier mapping...`, { indent: 2, star: true, nl: false })

  /* Inject the compressedTiersMapping */
  if (await nftDictionary._tokenTierMappingCompressedSet()) {
    log(`${'already'.yellow} set.`)
  } else {
    const intervalID = setInterval(() => log('.', { nl: false }), 5000)

    // iterate through all tokens to get their tierIndex  (run a task)
    const compressedTierData =
      compressTokenTierMappingsFromArray(await getAllTellerNFTTierData(hre))
    if (compressedTierData == null) {
      throw new Error('Failed to compress token tier data')
    }

    const receipt = await nftDictionary
      .connect(deployer)
      .setAllTokenTierMappings(compressedTierData)
      .then(({ wait }) => wait())

    clearInterval(intervalID)

    log(` set with ${colors.cyan(`${receipt.gasUsed} gas`)}`)
  }
}

const compressTokenTierMappingsFromArray = (
  tokenTiers: ethers.BigNumber[]
): string[] => {
  const tokenTierMappingCompressed = []

  const tokenTierMappingLengthMax = tokenTiers.length / 32

  for (let i = 0; i < tokenTierMappingLengthMax; i++) {
    let newRow = '0x'

    for (let j = 0; j < 32; j++) {
      const tokenId = i * 32 + j

      if (tokenId < tokenTiers.length) {
        const tierLevelHexBytes = tokenTiers[tokenId].toHexString().substr(2)
        newRow += tierLevelHexBytes.padStart(2, '0')
      } else {
        newRow += '00'
      }
    }

    tokenTierMappingCompressed.push(newRow)
  }

  return tokenTierMappingCompressed
}

export const getAllTellerNFTTierData = async (
  hre: HardhatRuntimeEnvironment
): Promise<ethers.BigNumber[]> => {
  const { contracts, ethers, toBN } = hre

  const nft = await contracts.get<TellerNFT>('TellerNFT')

  const info: ethers.BigNumber[] = []
  try {
    let nftID = ethers.BigNumber.from(0)
    while (await nft.ownerOf(nftID)) {
      const { index_ } = await nft.getTokenTier(nftID)

      info.push(index_)
      nftID = nftID.add(1)
    }
  } catch (e) {
    // Throws once all NFTs have been looped
  }
  return info
}

task(
  'add-nft-tiers',
  'Saves the tier information in the config file ("./config/nft.ts") directly to the NFT'
)
  .addFlag('sendTx', 'Required flag to ensure this is not ran on accident')
  .setAction(addTiers)
