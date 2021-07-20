import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Signer } from 'ethers'
import hre from 'hardhat'

import { getTokens } from '../../config'
import { Address } from '../../types/custom/config-types'
import { PriceAggregator } from '../../types/typechain'

chai.should()
chai.use(chaiAsPromised)

const { contracts, tokens, deployments, getNamedSigner, toBN } = hre

describe.only('PriceAggregator', () => {
  let priceAgg: PriceAggregator
  let deployer: Signer

  const tokenAddresses = getTokens(hre.network)
  const pairs = [
    ['dai', 'weth'],
    ['usdc', 'weth'],
    ['link', 'weth'],
  ]

  const getTokenAddress = (sym: string): Address =>
    tokenAddresses.all[sym.toUpperCase()]

  before(async () => {
    await deployments.fixture('protocol')

    priceAgg = await contracts.get<PriceAggregator>('PriceAggregator')
    deployer = await getNamedSigner('deployer')
  })

  describe('getPriceFor', () => {
    for (const [base, quote] of pairs) {
      it(`Should be able get the latest price for ${base}/${quote}`, async () => {
        const answer = await priceAgg.getPriceFor(
          getTokenAddress(base),
          getTokenAddress(quote)
        )

        answer.gt(0).should.eql(true, 'Chainlink pair zero price')
      })
    }
  })

  describe('getValueFor', () => {
    for (const [base, quote] of pairs) {
      it(`Should be able get the latest price for ${base}/${quote}`, async () => {
        const answer = await priceAgg.getValueFor(
          getTokenAddress(base),
          getTokenAddress(quote),
          await tokens.get(base).then(async (t) => toBN(1, await t.decimals()))
        )

        answer.gt(0).should.eql(true, 'Chainlink pair zero value')
      })
    }
  })
})
