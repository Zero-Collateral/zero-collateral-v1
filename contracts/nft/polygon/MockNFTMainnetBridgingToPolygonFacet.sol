// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import {
    NFTMainnetBridgingToPolygonFacet
} from "./NFTMainnetBridgingToPolygonFacet.sol";

contract MockNFTMainnetBridgingToPolygonFacet is
    NFTMainnetBridgingToPolygonFacet
{
    constructor(address polygonNFT)
        NFTMainnetBridgingToPolygonFacet(polygonNFT)
    {}

    function __depositFor(bytes memory tokenData) internal override {}
}
