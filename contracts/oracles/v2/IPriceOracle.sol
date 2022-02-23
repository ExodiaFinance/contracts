// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

interface IPriceOracle {
    function getSafePrice(address token) external view returns (uint256 _amountOut);

    function getCurrentPrice(address token) external view returns (uint256 _amountOut);

    function updateSafePrice(address token) external returns (uint256 _amountOut);

    function VERSION() external view returns (uint256);
}
