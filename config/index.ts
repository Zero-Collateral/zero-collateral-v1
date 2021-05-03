import { Network } from 'hardhat/types'

import { Tokens } from '../types/custom/config-types'
import { assetSettings } from './asset-settings'
import { atms } from './atms'
import { chainlink } from './chainlink'
import { markets } from './markets'
import { nftMerkleTree, tiers as nftTiers } from './nft'
import { nodes } from './nodes'
import { platformSettings } from './platform-settings'
import { signers } from './signers'
import { tokens } from './tokens'

const getNetworkName = (network: Network): string =>
  network.config.forkName ?? network.name

export const getAssetSettings = (network: Network) =>
  assetSettings[getNetworkName(network)]

export const getATMs = (network: Network) => atms[getNetworkName(network)]

export const getChainlink = (network: Network) =>
  chainlink[getNetworkName(network)]

export const getMarkets = (network: Network) => markets[getNetworkName(network)]

export const getNodes = (network: Network) => nodes[getNetworkName(network)]

export const getPlatformSettings = (network: Network) =>
  platformSettings[getNetworkName(network)]

export const getSigners = (network: Network) => signers[network.name]

export const getTokens = (network: Network) => {
  const networkTokens = tokens[getNetworkName(network)]
  const all: Tokens = Object.keys(networkTokens).reduce((map, type) => {
    // @ts-expect-error keys
    map = { ...map, ...networkTokens[type] }
    return map
  }, {})
  return {
    ...networkTokens,
    all,
  }
}

export const getNFT = (network: Network) => {
  const distributionsOutputFile = `deployments/${
    network.config.forkName != null ? 'localhost' : network.name
  }/.nftDistribution.json`

  return {
    tiers: nftTiers,
    merkleTrees: nftMerkleTree[getNetworkName(network)],
    distributionsOutputFile,
  }
}
