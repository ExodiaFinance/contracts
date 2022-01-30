// SPDX-License-Identifier: MIT
pragma solidity >=0.7.5;
pragma abicoder v2;

struct Allocations {
    uint allocated; // amount deposited in all strategies
    address[] strategies; // address of strategies
    uint[] allocations; // sum up to 100_000, ratio of tokens going to the strategy
}

interface IAssetAllocator {

    function collectProfits(address _token) external;
    function collectRewards(address _token) external;
    function rebalance(address _token) external;
    function sendToTreasury(address _token, uint _amount) external;
    
    function withdrawFromStrategy(
        address _token,
        address _strategy,
        uint _amount
    ) external;
    
    function emergencyWithdrawFromStrategy(
        address[] calldata _tokens,
        address _strategy
    ) external;
    
    function setAllocation(
        address _token,
        address[] calldata _strategies,
        uint[] calldata _allocations
    ) external;
    function getAllocation(address _token) external view returns (Allocations memory);
    
    function allocatedBalance(address _token) external view returns (uint);
    
}
