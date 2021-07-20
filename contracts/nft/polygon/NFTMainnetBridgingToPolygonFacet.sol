// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

// Contracts
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import { TellerNFT } from "../TellerNFT.sol";

// Libraries
import { NFTLib } from "../libraries/NFTLib.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import {
    EnumerableSet
} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// Storage
import { NFTStorageLib, NFTStorage } from "../../storage/nft.sol";

contract NFTMainnetBridgingToPolygonFacet {
    // immutable and constant addresses
    address public immutable POLYGON_NFT_ADDRESS;
    address public constant ERC721_PREDICATE =
        0x74D83801586E9D3C4dc45FfCD30B54eA9C88cf9b;
    address public constant ROOT_CHAIN_MANAGER =
        0xD4888faB8bd39A663B63161F5eE1Eae31a25B653;
    TellerNFT public constant TELLER_NFT =
        TellerNFT(0x2ceB85a2402C94305526ab108e7597a102D6C175);

    constructor(address polygonNFT) {
        POLYGON_NFT_ADDRESS = polygonNFT;
    }

    /**
     * @notice it unstakes our staked tokens, or transfers our unstaked tokens to the diamond
     * before making a call to the RootChainManager
     * @dev makes a function call to `depositFor` on the RootChainManager, which speaks to the
     * ChildChainManager, calling our PolyTellerNFT.
     * @param tokenData the tokenData that's decoded and bridged
     * @param staked are the tokens sent by the user staked?
     */
    function __bridgePolygonDepositFor(bytes memory tokenData, bool staked)
        private
    {
        if (tokenData.length == 32) {
            uint256 tokenId = abi.decode(tokenData, (uint256));
            if (staked) {
                NFTLib.unstake(tokenId);
            } else {
                NFTLib.nft().transferFrom(msg.sender, address(this), tokenId);
            }
        } else {
            uint256[] memory tokenIds = abi.decode(tokenData, (uint256[]));
            if (staked) {
                for (uint256 i; i < tokenIds.length; i++) {
                    NFTLib.unstake(tokenIds[i]);
                }
            } else {
                for (uint256 i; i < tokenIds.length; i++) {
                    NFTLib.nft().transferFrom(
                        msg.sender,
                        address(this),
                        tokenIds[i]
                    );
                }
            }
        }

        __depositFor(tokenData);
    }

    function __depositFor(bytes memory tokenData) internal virtual {
        // Deposit tokens by calling the RootChainManager which then has the ERC721_PREDICATE transfer the tokens
        Address.functionCall(
            ROOT_CHAIN_MANAGER,
            abi.encodeWithSignature(
                "depositFor(address,address,bytes)",
                msg.sender,
                address(TELLER_NFT),
                tokenData
            )
        );
    }

    /**
     * @notice it initializes our NFTBridge by approving all NFTs to the Polygon ERC721_Predicate
     */
    function initNFTBridge() external {
        TELLER_NFT.setApprovalForAll(ERC721_PREDICATE, true);
    }

    /**
     * @notice checks if tokenId is stake or unstaked, then calls the bridge function with the
     * encoded tokenId
     * @param tokenId the tokenId to encode and send to the bridge function
     */
    function bridgeNFT(uint256 tokenId) external {
        bool isStaked = EnumerableSet.contains(
            NFTLib.s().stakedNFTs[msg.sender],
            tokenId
        );
        __bridgePolygonDepositFor(abi.encode(tokenId), isStaked);
    }

    /**
     * @notice gets all of our NFTs (staked and unstaked) then sends them to be bridged
     */
    function bridgeAllNFTs() external {
        uint256[] memory tokenIDs;

        // Staked tokens
        tokenIDs = NFTLib.stakedNFTs(msg.sender);
        if (tokenIDs.length > 0) {
            __bridgePolygonDepositFor(abi.encode(tokenIDs), true);
        }

        // Unstaked (aka in the user's wallet) tokens
        tokenIDs = TELLER_NFT.getOwnedTokens(msg.sender);
        if (tokenIDs.length > 0) {
            __bridgePolygonDepositFor(abi.encode(tokenIDs), false);
        }
    }
}
