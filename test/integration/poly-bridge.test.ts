import { MaticPOSClient } from '@maticnetwork/maticjs'
import rootChainManagerAbi from '@maticnetwork/meta/network/mainnet/v1/artifacts/pos/RootChainManager.json'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { BigNumber, Contract, Signer } from 'ethers'
import hre, {
  contracts,
  ethers,
  evm,
  getNamedAccounts,
  getNamedSigner,
} from 'hardhat'

import { getMarkets, getNFT } from '../../config'
import { nftMerkleTree } from '../../config/nft'
import {
  claimNFT,
  getPlatformSetting,
  updatePlatformSetting,
} from '../../tasks'
import { Market } from '../../types/custom/config-types'
import { ITellerDiamond, PolyTellerNFT, TellerNFT } from '../../types/typechain'

chai.should()
chai.use(solidity)

const maticPOSClient = new MaticPOSClient({
  network: 'testnet',
  version: 'mumbai',
  parentProvider:
    'https://mainnet.infura.io/v3/514733758a4e4c1da27f5e2d61c97ee4',
  maticProvider: 'https://rpc-mainnet.maticvigil.com',
})

describe.only('Bridging Assets to Polygon', () => {
  getMarkets(hre.network).forEach(testBridging)
  function testBridging(markets: Market): void {
    let deployer: Signer
    let diamond: ITellerDiamond
    let rootToken: TellerNFT
    let childToken: PolyTellerNFT
    let borrower: string
    let borrowerSigner: Signer
    let ownedNFTs: BigNumber[]
    let unstakedNFTs: BigNumber[]
    let rootChainManager: Contract
    before(async () => {
      await hre.deployments.fixture(['market'], {
        keepExistingDeployments: true,
      })
      rootToken = await contracts.get('TellerNFT')
      childToken = await contracts.get('PolyTellerNFT')
      diamond = await contracts.get('TellerDiamond')
      deployer = await getNamedSigner('deployer')
      borrower = '0x86a41524cb61edd8b115a72ad9735f8068996688'
      borrowerSigner = (await hre.evm.impersonate(borrower)).signer
      rootChainManager = new ethers.Contract(
        '0xD4888faB8bd39A663B63161F5eE1Eae31a25B653',
        rootChainManagerAbi.abi,
        borrowerSigner
      )
      await claimNFT({ account: borrower, merkleIndex: 0 }, hre)
      ownedNFTs = await rootToken
        .getOwnedTokens(borrower)
        .then((arr) => (arr.length > 2 ? arr.slice(0, 2) : arr))
      unstakedNFTs = await rootToken
        .getOwnedTokens(borrower)
        .then((arr) => (arr.length > 2 ? arr.slice(0, 2) : arr))
    })
    describe('Calling mapped contracts', () => {
      it('approves spending of tokens', async () => {
        const erc721Predicate = '0x74D83801586E9D3C4dc45FfCD30B54eA9C88cf9b'
        await claimNFT({ account: borrower, merkleIndex: 0 }, hre)
        ownedNFTs = await rootToken
          .getOwnedTokens(borrower)
          .then((arr) => (arr.length > 2 ? arr.slice(0, 2) : arr))
        for (let i = 0; i < ownedNFTs.length; i++) {
          await rootToken
            .connect(borrowerSigner)
            .approve(erc721Predicate, ownedNFTs[i])

          const approved = await rootToken
            .connect(borrower)
            .getApproved(ownedNFTs[i])
          expect(erc721Predicate).to.equal(approved)
        }
      })
      it('deposits tokens in the root', async () => {
        const depositData = ethers.utils.defaultAbiCoder.encode(
          ['uint256[]', 'address'],
          [ownedNFTs, borrower]
        )
        const tellerNFTAddress = '0x2ceB85a2402C94305526ab108e7597a102D6C175'
        await rootChainManager
          .connect(borrowerSigner)
          .depositFor(borrower, tellerNFTAddress, depositData)
      })
    })
    describe.only('Mock tests', () => {
      describe('stake, unstake, deposit to polygon', () => {
        it('stakes NFTs on behalf of the user', async () => {
          await rootToken
            .connect(borrowerSigner)
            .setApprovalForAll(diamond.address, true)
          await diamond.connect(borrowerSigner).stakeNFTs(ownedNFTs)
          const stakedNFTs = await diamond.getStakedNFTs(borrower)
          for (let i = 0; i < ownedNFTs.length; i++) {
            expect(ownedNFTs[i]).to.equal(stakedNFTs[i])
          }
        })
        it('unstakes the nfts then "deposits" to polygon', async () => {
          // bridge all of our nfts
          await diamond.connect(borrowerSigner).bridgeAllNFTs()

          // after unstaking our NFTs, it would make sense that the
          // length of our staked NFTs is zero
          const stakedNFTs = await diamond.getStakedNFTs(borrower)
          expect(stakedNFTs.length).to.equal(0)

          // we also expect that the diamonds now own all our unstakded NFTs
          const ownedNFTs = await rootToken
            .getOwnedTokens(diamond.address)
            .then((arr) => (arr.length > 2 ? arr.slice(0, 2) : arr))
          for (let i = 0; i < ownedNFTs.length; i++) {
            expect(await rootToken.ownerOf(ownedNFTs[i])).to.equal(
              diamond.address
            )
          }
        })
        it('stakes the NFTs on "polygon"', async () => {
          // encode data
          const stakedNFTs = await diamond.getStakedNFTs(borrower)
          const depositData = ethers.utils.defaultAbiCoder.encode(
            ['uint256[]'],
            [stakedNFTs]
          )
          // stake the nfts and "send them to" root chain manager
          await childToken.connect(deployer).deposit(borrower, depositData)
        })
      })
      // describe('burns the tokens then "deposits" back to ethereum', () => {
      //   it('unstakes NFTs on polygon and burns them', async () => {
      //     const burnTx = await childToken
      //       .connect(borrowerSigner)
      //       .withdrawBatch(ownedNFTs)

      //     // from matic docs
      //     const exitCallData = await maticPOSClient.exitERC721(
      //       JSON.stringify(burnTx),
      //       {
      //         from: diamond.address,
      //         encodeAbi: true,
      //       }
      //     )
      //     // exit call data
      //     await diamond.connect(borrowerSigner).exit(exitCallData)
      //   })
      //   it('stakes the NFTs on ethereum', async () => {
      //     await diamond.connect(borrowerSigner).stakeNFTs(ownedNFTs)
      //     const stakedNFTs = await diamond.getStakedNFTs(borrower)
      //     for (let i = 0; i < ownedNFTs.length; i++) {
      //       expect(ownedNFTs[i]).to.equal(stakedNFTs[i])
      //     }
      //   })
      // })
    })
  }
})
