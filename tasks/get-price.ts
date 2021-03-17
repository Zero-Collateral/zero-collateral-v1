import { task, types } from 'hardhat/config'
import { ChainlinkAggregator } from '../types/typechain'
import { getTokens } from '../config/tokens'
import { Network } from '../types/custom/config-types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { BigNumberish } from 'ethers'

interface GetPricesArgs {
  src: string
  dst: string
  amount?: BigNumberish
}

export interface GetPricesReturn {
  value: string
}

export const getPrice = async (
  args: GetPricesArgs,
  hre: HardhatRuntimeEnvironment
): Promise<GetPricesReturn> => {
  const { src, dst, amount } = args
  const { contracts, network, tokens, ethers } = hre
  const { BigNumber: BN, FixedNumber: FN } = ethers
  const { [src]: srcAddress, [dst]: dstAddress } = getTokens(
    <Network>network.name
  )

  const chainLinkAggregator = await contracts.get<ChainlinkAggregator>(
    'ChainlinkAggregator'
  )
  let decimals = 18
  if (dst !== 'ETH') {
    const token = await tokens.get(dst)
    decimals = await token.decimals()
  }
  const factor = BN.from(10).pow(decimals)
  const answer = await chainLinkAggregator.latestAnswerFor(
    srcAddress,
    dstAddress
  )
  const price = FN.from(answer).divUnsafe(FN.from(factor.toString()))
  let value = price
  if (amount) {
    const valueFor = await chainLinkAggregator.valueFor(
      srcAddress,
      dstAddress,
      BN.from(amount).mul(factor)
    )
    value = FN.from(valueFor.toString()).divUnsafe(FN.from(factor.toString()))
  }

  console.log(`
  Pair    : ${src}/${dst}
  Price   : ${price.toString()}
  Value   : ${value.toString()}
  `)

  return {
    value: value.toString(),
  }
}

task('get-price', 'Gets the value for a given token in terms of another')
  .addParam('src', 'The source token symbol')
  .addParam('dst', 'The destination token symbol')
  .addOptionalParam(
    'amount',
    'The amount to get the value for',
    null,
    types.int
  )
  .setAction(getPrice)
