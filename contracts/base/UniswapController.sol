pragma solidity 0.5.17;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router01.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "../interfaces/ISwapper.sol";
import "../util/NumbersLib.sol";
import "./Base.sol";

contract UniswapController is Base, ISwapper {
    using NumbersLib for *;
    using SafeERC20 for IERC20;

    IUniswapV2Router01 private constant ROUTER = IUniswapV2Router01(
        0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
    );

    IChainlinkAggregator private chainlink;

    uint256 private minAmountOutPercent;
    uint256 private maxSecondsToSwap;

    function initialize(uint256 _minAmountOutPercent, uint256 _maxSecondsToSwap)
        external
    {
        require(
            _minAmountOutPercent >= 8000 && _minAmountOutPercent < 10000,
            "MIN_AMOUNT_INVALID"
        );
        require(
            _maxSecondsToSwap > 0 && _maxSecondsToSwap <= 3600,
            "MAX_SECONDS_INVALID"
        );

        minAmountOutPercent = _minAmountOutPercent;
        maxSecondsToSwap = _maxSecondsToSwap;
        chainlink = _getSettings().chainlinkAggregator();
    }

    function swap(uint256 amountIn, address[] path) external returns (uint256 amountOut) {
        IERC20 srcToken = IERC20(path[0]);
        srcToken.safeIncreaseAllowance(ROUTER, amountIn);

        uint256 chainlinkQuote = chainlink.valueFor(
            path[0],
            path[path.length - 1],
            amountIn
        );
        uint256 amountOutMin = chainlinkQuote.percent(minAmountOutPercent);

        uint256[] amounts = ROUTER.swapExactTokensForTokenrouters(
            amountIn,
            amountOutMin,
            path,
            address(this),
            now + maxSecondsToSwap
        );

        return amounts[amounts.length - 1];
    }
}
