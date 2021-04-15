import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Signer } from 'ethers'
import hre from 'hardhat'

import { getChainlink, getTokens } from '../../config'
import { Address } from '../../types/custom/config-types'
import { ITellerDiamond } from '../../types/typechain'
import { NULL_ADDRESS } from '../../utils/consts'
import { setup } from '../helpers/setup'

chai.should()
chai.use(chaiAsPromised)

const { tokens, deployments, getNamedSigner, toBN } = hre

describe('PriceAggregator', () => {
  let diamond: ITellerDiamond
  let deployer: Signer

  const chainlink = getChainlink(hre.network)
  const tokenAddresses = getTokens(hre.network)
  const pairs = Object.values(chainlink)

  const getTokenAddress = (sym: string): Address => tokenAddresses.all[sym]

  before(async () => {
    await deployments.fixture('protocol')
    ;({ diamond, deployer } = await setup())
  })

  describe('addChainlinkAggregator', () => {
    it('Should not be able to add a Chainlink aggregator as not an admin', async () => {
      // Sender address
      const lender = await getNamedSigner('lender')

      await diamond
        .connect(lender)
        .addChainlinkAggregator(
          getTokenAddress(pairs[0].baseTokenName),
          getTokenAddress(pairs[0].quoteTokenName),
          pairs[0].address
        )
        .should.be.rejectedWith('AccessControl: not authorized')
    })

    for (const pair of pairs) {
      it(`Should be able add Chainlink aggregators for ${pair.baseTokenName}/${pair.quoteTokenName} an admin`, async () => {
        const srcTokenAddress = getTokenAddress(pair.baseTokenName)
        const dstTokenAddress = getTokenAddress(pair.quoteTokenName)

        // Add aggregator
        await diamond
          .connect(deployer)
          .addChainlinkAggregator(
            srcTokenAddress,
            dstTokenAddress,
            pair.address
          )

        // Check if aggregator was successfully added
        const aggregatorResponse = await diamond.getChainlinkAggregatorFor(
          srcTokenAddress,
          dstTokenAddress
        )

        // const tokenSupportResponse = await priceAggregator.isTokenSupported(
        //   srcTokenAddress
        // )

        aggregatorResponse.agg.should.be.equals(pair.address)
        // tokenSupportResponse.should.be.true
      })
    }
  })

  describe('removeChainlinkAggregator', () => {
    it('Should not be able to remove an aggregator as not an admin', async () => {
      // Sender address
      const lender = await getNamedSigner('lender')

      await diamond
        .connect(lender)
        .removeChainlinkAggregator(
          getTokenAddress(pairs[0].baseTokenName),
          getTokenAddress(pairs[0].quoteTokenName)
        )
        .should.be.rejectedWith('AccessControl: not authorized')
    })

    for (const pair of pairs) {
      it(`Should be able remove the aggregator for ${pair.baseTokenName}/${pair.quoteTokenName} as an admin`, async () => {
        const revert = await hre.evm.snapshot()

        const srcTokenAddress = getTokenAddress(pair.baseTokenName)
        const dstTokenAddress = getTokenAddress(pair.quoteTokenName)

        // Remove aggregator
        await diamond
          .connect(deployer)
          .removeChainlinkAggregator(srcTokenAddress, dstTokenAddress)

        // Check if aggregator was successfully removed
        const { agg } = await diamond.getChainlinkAggregatorFor(
          srcTokenAddress,
          dstTokenAddress
        )

        agg.should.be.equal(NULL_ADDRESS)

        await revert()
      })
    }
  })

  describe('getPriceFor', () => {
    for (const pair of pairs) {
      it(`Should be able get the latest price for ${pair.baseTokenName}/${pair.quoteTokenName}`, async () => {
        const answer = await diamond.getPriceFor(
          getTokenAddress(pair.baseTokenName),
          getTokenAddress(pair.quoteTokenName)
        )

        answer.gt(0).should.eq(true)
      })
    }
  })

  describe('getValueFor', () => {
    for (const pair of pairs) {
      it(`Should be able get the latest price for ${pair.baseTokenName}/${pair.quoteTokenName}`, async () => {
        const answer = await diamond.getValueFor(
          getTokenAddress(pair.baseTokenName),
          getTokenAddress(pair.quoteTokenName),
          await tokens
            .get(pair.baseTokenName)
            .then(async (t) => toBN(1, await t.decimals()))
        )

        answer.gt(0).should.eq(true)
      })
    }
  })
})