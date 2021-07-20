import chai, { expect } from 'chai'
import { Console } from 'console'
import { solidity } from 'ethereum-waffle'
import { BigNumber, Signer } from 'ethers'
import hre from 'hardhat'

import { getMarkets, getNFT } from '../../config'
import { claimNFT } from '../../tasks'
import { Market } from '../../types/custom/config-types'
import { ITellerDiamond, TellerNFT } from '../../types/typechain'
import { fundedMarket } from '../fixtures'
import {
  LoanType,
  takeOutLoanWithNfts,
  takeOutLoanWithoutNfts,
} from '../helpers/loans'

chai.should()
chai.use(solidity)

const { getNamedSigner, contracts, tokens, ethers, evm, toBN } = hre

describe('NFT tests', () => {
  let deployer: Signer
  let diamond: ITellerDiamond
  let borrowerSigner: Signer
  let borrower: string
  let ownedNFTs: BigNumber[]
  let stakedNFTs: BigNumber[]
  let rootToken: TellerNFT

  before(async () => {
    // addresses
    deployer = await getNamedSigner('deployer')
    borrower = '0x86a41524cb61edd8b115a72ad9735f8068996688'
    borrowerSigner = (await hre.evm.impersonate(borrower)).signer

    // diamond and teller nft
    diamond = await contracts.get('TellerDiamond')
    rootToken = await contracts.get('TellerNFT')

    // claim nft on behalf of the borrower
    await claimNFT({ account: borrower, merkleIndex: 0 }, hre)

    // get borrower's owned nfts
    ownedNFTs = await rootToken
      .getOwnedTokens(borrower)
      .then((arr) => (arr.length > 2 ? arr.slice(0, 2) : arr))

    // approve transfering NFTs from the borrower to the diamond address
    await rootToken
      .connect(borrowerSigner)
      .setApprovalForAll(diamond.address, true)
  })
  describe('unstakes NFTs after staking them', () => {
    it('should stake NFTs', async () => {
      // stake NFTs on behalf of user
      await diamond.connect(borrowerSigner).stakeNFTs(ownedNFTs)

      // get staked
      stakedNFTs = await diamond.getStakedNFTs(borrower)

      // every tokenId of the owned NFT should equate a token ID from the stakedNFT
      for (let i = 0; i < ownedNFTs.length; i++) {
        expect(ownedNFTs[i]).to.equal(stakedNFTs[i])
      }
    })
    it('should unstake NFTs', async () => {
      // unstake all of our staked NFTs
      await diamond.connect(borrowerSigner).unstakeNFTs(stakedNFTs)

      // retrieve our staked NFTs (should be empty)
      stakedNFTs = await diamond.getStakedNFTs(borrower)

      // we expect our staked NFTs length to be 0
      expect(stakedNFTs.length).to.equal(0)
    })
  })
  describe('unstakes NFTs from the wrong address', () => {
    it('should stake NFTs', async () => {
      // stake NFTs on behalf of user
      await diamond.connect(borrowerSigner).stakeNFTs(ownedNFTs)

      // get staked
      stakedNFTs = await diamond.getStakedNFTs(borrower)

      // every tokenId of the owned NFT should equate a token ID from the stakedNFT
      for (let i = 0; i < ownedNFTs.length; i++) {
        expect(ownedNFTs[i]).to.equal(stakedNFTs[i])
      }
    })
    it('should unstake NFTs from the wrong address and fail', async () => {
      // unstake all of our staked nfts from the wrong address
      await diamond
        .connect(deployer)
        .unstakeNFTs(stakedNFTs)
        .should.be.revertedWith('Teller: not the owner of the NFT ID!')
    })
  })
})
