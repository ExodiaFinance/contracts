// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

interface SolidlyBaseV1Pair is IUniswapV2Pair {
    function current(address tokenIn, uint256 amountIn)
        external
        view
        returns (uint256 amountOut);

    function quote(
        address tokenIn,
        uint256 amountIn,
        uint256 granularity
    ) external view returns (uint256 amountOut);
}
