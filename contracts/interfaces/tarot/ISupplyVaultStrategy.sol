// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;

import "./IBorrowable.sol";
import "./ISupplyVault.sol";

interface ISupplyVaultStrategy {
    function getBorrowable(address user) external view returns (IBorrowable);

    function getSupplyRate() external returns (uint256 supplyRate);

    function allocate() external;

    function deallocate(uint256 underlyingAmount) external;

    function reallocate(uint256 underlyingAmount, bytes calldata data) external;
}
