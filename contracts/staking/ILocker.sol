// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface ILocker {
    function getToken() external view returns (address);

    function getRewardsToken() external view returns (address);

    function lock(uint256 amount, uint8 period) external payable returns (uint256);

    function unlock(uint256 fnftId, uint256 quantity) external returns (bool);
}
