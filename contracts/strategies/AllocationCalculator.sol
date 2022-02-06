// SPDX-License-Identifier: MIT
pragma solidity ^0.7.5;
pragma abicoder v2;

import "../librairies/SafeMath.sol";
import "../interfaces/IERC20.sol";
import "../Policy.sol";
import "./IAllocationCalculator.sol";

import "hardhat/console.sol";

struct Strategies {
    address[] addresses; // address of strategies
    uint[] allocations; // sum up to 100_000, ratio of tokens going to the strategy
}

contract AllocationCalculator is Policy, IAllocationCalculator {
    using SafeMath for uint256;
    
    mapping(address => Strategies) tokenStrategies;

    function getAllocation(address _token) external view override returns (address[] memory, uint[] memory) {
        Strategies memory strategies = tokenStrategies[_token];
        return (strategies.addresses, strategies.allocations);
    }

    function setAllocation(
        address _token,
        address[] calldata _strategies,
        uint[] calldata _allocations)
    external override onlyPolicy {
        Strategies storage allocations = tokenStrategies[_token];
        allocations.addresses = _strategies;
        allocations.allocations = _allocations;
    }
    
    function calculateAllocation(address _token, uint _manageable)external view override returns (uint[] memory, uint){
        Strategies memory strategies = tokenStrategies[_token];
        uint[] memory allocations = new uint[](strategies.allocations.length);
        uint allocated = 0;
        for(uint i = 0; i < allocations.length; i++){
            uint allocation = strategies.allocations[i].mul(_manageable).div(1e5);
            allocations[i] = allocation;
            allocated += allocation;
        }
        return (allocations, allocated);
    }
    
    function getStrategies(address _token) external view override returns(address[] memory){
        return tokenStrategies[_token].addresses;
    }
    
}
