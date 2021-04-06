// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Contracts
import "../storage/token.sol";
import "../storage/tier.sol";

// Libraries
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

abstract contract int_metadata_NFT_v1 is sto_Token, sto_Tier {
    using SafeMath for uint256;

    /**
     * @notice The base URI path where the token media is hosted.
     * @dev Base URI for computing {tokenURI}.
     */
    function _baseURI() internal view virtual returns (string memory) {
        return "https://gateway.pinata.cloud/ipfs/";
    }

    /**
     * @notice It returns the hash to use for the token URI.
     */
    function _tokenURI(uint256 tokenId)
        internal
        view
        virtual
        returns (string memory)
    {
        string[] storage tierImageHashes =
            tierStore().tiers[tierStore().tokenTierMap[tokenId]].hashes;
        return tierImageHashes[tokenId.mod(tierImageHashes.length)];
    }

    /**
     * @dev Sets the URI for the contract metadata.
     */
    function _setContractURI(string memory uri) internal {
        tokenStore().contractURI = uri;
    }
}