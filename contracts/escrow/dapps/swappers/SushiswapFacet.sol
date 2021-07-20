// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Contracts
import { AbstractUniSwapper } from "./AbstractUniSwapper.sol";

// Libraries
import { LibEscrow } from "../../libraries/LibEscrow.sol";

// Interfaces
import {
    IUniswapV2Router
} from "../../../shared/interfaces/IUniswapV2Router.sol";

contract SushiswapFacet is AbstractUniSwapper {
    /**
     * @notice Sets the swapping router address on protocol deployment.
     * @param routerAddress The address of the swapping router contract on the network.
     */
    constructor(address routerAddress) AbstractUniSwapper(routerAddress) {}

    /**
     * @notice Event emitted every time a successful swap has taken place.
     * @param sourceToken source token address.
     * @param destinationToken destination address.
     * @param sourceAmount source amount sent.
     * @param destinationAmount destination amount received.
     */
    event SushiswapSwapped(
        address indexed sourceToken,
        address indexed destinationToken,
        uint256 sourceAmount,
        uint256 destinationAmount
    );

    /**
     * @notice Swaps tokens for tokens on Sushiswap.
     * @dev {path} must have at least 2 token addresses
     * @param path An array of token addresses.
     * @param sourceAmount amount of source token to swap.
     * @param minDestination The minimum amount of output tokens that must be received for the transaction not to revert.
     */
    function sushiswapSwap(
        uint256 loanID,
        address[] memory path,
        uint256 sourceAmount,
        uint256 minDestination
    ) external paused("", false) onlySecured(loanID) onlyBorrower(loanID) {
        require(
            __isValidPath(path[0], path[path.length - 1]),
            "Teller: swapper dst not supported"
        );

        // Set allowance on source token to Uniswap Router
        LibEscrow.e(loanID).setTokenAllowance(path[0], address(ROUTER_ADDRESS));

        // Encode data for LoansEscrow to call
        bytes memory callData = abi.encodeWithSelector(
            IUniswapV2Router.swapExactTokensForTokens.selector,
            sourceAmount,
            minDestination,
            path,
            address(LibEscrow.e(loanID)),
            block.timestamp
        );

        // Call Escrow to do swap get the response amounts
        uint256[] memory amounts = abi.decode(
            LibEscrow.e(loanID).callDapp(address(ROUTER_ADDRESS), callData),
            (uint256[])
        );

        LibEscrow.tokenUpdated(loanID, path[0]);
        LibEscrow.tokenUpdated(loanID, path[path.length - 1]);

        emit SushiswapSwapped(
            path[0],
            path[path.length - 1],
            sourceAmount,
            amounts[amounts.length - 1]
        );
    }
}
