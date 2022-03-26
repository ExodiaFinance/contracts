// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;

interface IStakingHelper {
    function stake(uint256 _amount, address _recipient) external;
}
