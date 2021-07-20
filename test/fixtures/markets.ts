import { BigNumberish } from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { ERC20, ITellerDiamond } from '../../types/typechain'
import { getFunds } from '../helpers/get-funds'

export interface FundedMarketArgs {
  assetSym: string
  // Amount should be denoted in decimal value for the token (i.e. 100 = 100 * (10^tokenDecimals)
  amount?: BigNumberish
  tags?: string[]
  // fund?: boolean
}

export interface FundedMarketReturn {
  diamond: ITellerDiamond
  lendingToken: ERC20
}

export const fundedMarket = async (
  hre: HardhatRuntimeEnvironment,
  opts?: FundedMarketArgs
): Promise<FundedMarketReturn> => {
  const { contracts, deployments, getNamedSigner, toBN, tokens } = hre
  const { assetSym = 'DAI', amount, tags = [] } = opts ?? {}

  tags.push('markets')
  await deployments.fixture(tags, {
    keepExistingDeployments: true,
  })

  const diamond = await contracts.get<ITellerDiamond>('TellerDiamond')
  const lendingToken = await tokens.get(assetSym)

  // Fund the market
  let amountToFundLP: BigNumberish
  if (amount) {
    const decimals = await lendingToken.decimals()
    amountToFundLP = toBN(amount, decimals)
  } else {
    amountToFundLP = await diamond.getMaxTVLAmount(lendingToken.address)
  }

  const funder = await getNamedSigner('funder')
  await getFunds({
    to: funder,
    tokenSym: assetSym,
    amount: amountToFundLP,
    hre,
  })
  await lendingToken.connect(funder).approve(diamond.address, amountToFundLP)
  await diamond
    .connect(funder)
    .lendingPoolDeposit(lendingToken.address, amountToFundLP)
  return {
    diamond,
    lendingToken,
  }
}
// )
