// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITreasuryTracker {
    function balances() external returns (address[] memory, uint256[] memory);
}
