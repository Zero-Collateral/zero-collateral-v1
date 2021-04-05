// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Contracts
import { Tier } from "../data.sol";

// Libraries
import "@openzeppelin/contracts/utils/Counters.sol";

abstract contract sto_Tier {
    struct TierStorage {
        // It holds the total number of tiers.
        Counters.Counter tierCounter;
        // It holds the total number of tokens minted for a tier.
        mapping(uint256 => Counters.Counter) tierTokenCounter;
        // It holds the information about a tier.
        mapping(uint256 => Tier) tiers;
        // It holds which tier a token ID is in.
        mapping(uint256 => uint256) tokenTierMap;
    }

    function tierStore() internal pure returns (TierStorage storage s) {
        bytes32 POSITION = keccak256("teller_nft.tier");

        assembly {
            s.slot := POSITION
        }
    }
}