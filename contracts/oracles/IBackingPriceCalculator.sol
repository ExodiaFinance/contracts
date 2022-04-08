// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBackingPriceCalculator {
    function getBackingPrice() external view returns (uint256);

    function fetchBackingPrice() external returns (uint256);
}
