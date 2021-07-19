// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Contracts
import { TellerNFT } from "../nft/TellerNFT.sol";
import { RolesMods } from "../contexts2/access-control/roles/RolesMods.sol";
import { ADMIN, AUTHORIZED } from "../shared/roles.sol";

// Libraries
import { NFTLib } from "./libraries/NFTLib.sol";
import { RolesLib } from "../contexts2/access-control/roles/RolesLib.sol";
import {
    EnumerableSet
} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract NFTFacet is RolesMods {
    /**
     * @notice it gets the staked NFTs mapped to an owner's address
     * @return staked_ the returned staked NFTs mapped to an owner's address
     */
    function getStakedNFTs(address nftOwner)
        public
        view
        returns (uint256[] memory staked_)
    {
        staked_ = NFTLib.stakedNFTs(nftOwner);
    }

    /**
     * @notice it returns the NFTs mapped to a loan
     * @param loanID the identifier of the respective loan to get the loan NFTs from
     * @return loanNFTs the loan NFTs mapped to a loan ID
     */
    function getLoanNFTs(uint256 loanID)
        external
        view
        returns (uint256[] memory loanNFTs)
    {
        EnumerableSet.UintSet storage nfts = NFTLib.s().loanNFTs[loanID];
        loanNFTs = new uint256[](EnumerableSet.length(nfts));
        for (uint256 i; i < EnumerableSet.length(nfts); i++) {
            loanNFTs[i] = EnumerableSet.at(nfts, i);
        }
    }

    /**
     * @notice Transfers multiple Teller NFTs to Diamond and applies user stake.
     * @param nftIDs IDs of Teller NFTs to stake.
     */
    function stakeNFTs(uint256[] calldata nftIDs) external {
        for (uint256 i; i < nftIDs.length; i++) {
            // Stake NFT and transfer into diamond
            NFTLib.stake(nftIDs[i], msg.sender);
        }
        // Give the caller authorization to protocol
        RolesLib.grantRole(AUTHORIZED, msg.sender);
    }
}
