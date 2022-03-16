// SPDX-License-Identifier: GNU-GPL v3.0 or later

pragma solidity ^0.8.0;

interface IInterestHandler {
    function registerDeposit(uint256 fnftId) external;

    function getPrincipal(uint256 fnftId) external view returns (uint256);

    function getInterest(uint256 fnftId) external view returns (uint256);

    function getAmountToWithdraw(uint256 fnftId) external view returns (uint256);

    function getUnderlyingToken(uint256 fnftId) external view returns (address);

    function getUnderlyingValue(uint256 fnftId) external view returns (uint256);

    //These methods exist for external operations
    function getPrincipalDetail(
        uint256 historic,
        uint256 amount,
        address asset
    ) external view returns (uint256);

    function getInterestDetail(
        uint256 historic,
        uint256 amount,
        address asset
    ) external view returns (uint256);

    function getUnderlyingTokenDetail(address asset) external view returns (address);

    function getInterestRate(address asset) external view returns (uint256);
}
