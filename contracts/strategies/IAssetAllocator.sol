// SPDX-License-Identifier: MIT
pragma solidity >=0.7.5;
pragma abicoder v2;

struct Allocations {
    uint allocated;
    address[] strategies; // address of strategy
    uint[] allocations; // sum up to 10000, ratio of tokens going to the strategy
}

interface IAssetAllocator {

    function reallocate(address _token) external;
    function sendToTreasury(address _token, uint _amount) external;
    function setAllocation(
        address _token,
        address[] calldata _strategies,
        uint[] calldata _allocations
    ) external;
    function getAllocation(address _token) external view returns (Allocations memory);
}
