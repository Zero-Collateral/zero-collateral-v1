import { Network } from 'hardhat/types'
import path from 'path'

import {
  AssetSettings,
  ATMs,
  Chainlink,
  Market,
  NetworkTokens,
  NFTMerkleTree,
  Nodes,
  PlatformSettings,
  Signers,
  TierInfo,
  Tokens,
} from '../types/custom/config-types'
import { assetSettings } from './asset-settings'
import { atms } from './atms'
import { chainlink } from './chainlink'
import { dapps } from './dapps'
import { markets } from './markets'
import { nftMerkleTree, tiers as nftTiers } from './nft'
import { nodes } from './nodes'
import { platformSettings } from './platform-settings'
import { signers } from './signers'
import { tokens } from './tokens'

export const getNetworkName = (network: Network): string =>
  process.env.FORKING_NETWORK ?? network.name

export const getAssetSettings = (network: Network): AssetSettings =>
  assetSettings[getNetworkName(network)]

export const getATMs = (network: Network): ATMs => atms[getNetworkName(network)]

export const getChainlink = (network: Network): Chainlink =>
  chainlink[getNetworkName(network)]

export const getMarkets = (network: Network): Market[] =>
  markets[getNetworkName(network)]

export const getNodes = (network: Network): Nodes =>
  nodes[getNetworkName(network)]

export const getPlatformSettings = (network: Network): PlatformSettings =>
  platformSettings[getNetworkName(network)]

export const getSigners = (network: Network): Signers => signers[network.name]

export const getTokens = (
  network: Network
): NetworkTokens & { all: Tokens } => {
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

export const getNativeToken = (network: Network): string => {
  const tokens = getTokens(network)
  let wrappedNativeToken: string
  const networkName = getNetworkName(network)
  if (
    networkName === 'mainnet' ||
    networkName === 'kovan' ||
    networkName === 'rinkeby' ||
    networkName === 'ropsten'
  ) {
    wrappedNativeToken = tokens.erc20.WETH
  } else {
    wrappedNativeToken = tokens.erc20.WMATIC
  }
  return wrappedNativeToken
}

export const getDappAddresses = (network: Network): Tokens =>
  dapps[getNetworkName(network)]

export const getNFT = (
  network: Network
): {
  tiers: TierInfo[]
  merkleTrees: NFTMerkleTree
  distributionsOutputFile: string
} => {
  const distributionsOutputFile = path.resolve(
    path.join(
      __dirname,
      '../deployments',
      network.name,
      '.nftDistribution.json'
    )
  )

  return {
    tiers: nftTiers,
    merkleTrees: nftMerkleTree[getNetworkName(network)],
    distributionsOutputFile,
  }
}
