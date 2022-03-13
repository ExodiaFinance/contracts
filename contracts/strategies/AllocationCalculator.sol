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
    uint[] maxAllocations; // in # of tokens
}

contract AllocationCalculator is Policy, IAllocationCalculator {
    using SafeMath for uint256;
    
    mapping(address => Strategies) tokenStrategies;

    function setAllocation(
        address _token,
        address[] memory _strategies,
        uint[] memory _allocations)
    external onlyPolicy {
        _setAllocation(_token, _strategies, _allocations, new uint[](_strategies.length));
    }
    
    function setAllocationWithMax(
        address _token,
        address[] memory _strategies,
        uint[] memory _allocations,
        uint[] memory _maxAllocations)
    external onlyPolicy {
        _setAllocation(_token, _strategies, _allocations, _maxAllocations);
    }

    function _setAllocation(
        address _token,
        address[] memory _strategies,
        uint[] memory _allocations,
        uint[] memory _maxAllocations)
    internal {
        Strategies storage allocations = tokenStrategies[_token];
        allocations.addresses = _strategies;
        allocations.allocations = _allocations;
        allocations.maxAllocations = _maxAllocations;
    }
    
    function calculateAllocation(address _token, uint _manageable)external view override returns (uint[] memory, uint){
        Strategies memory strategies = tokenStrategies[_token];
        uint[] memory allocations = new uint[](strategies.allocations.length);
        uint allocated = 0;
        for(uint i = 0; i < allocations.length; i++){
            uint allocation = strategies.allocations[i].mul(_manageable).div(1e5);
            uint maxAllocation = strategies.maxAllocations[i];
            if (maxAllocation != 0 && allocation > maxAllocation){
                allocation = maxAllocation;
            }
            allocations[i] = allocation;
            allocated += allocation;
        }
        return (allocations, allocated);
    }
    
    function _isAllocatable(address _token) external returns(bool){
        return tokenStrategies[_token].addresses.length > 0;
    }
    
    function getStrategies(address _token) external view override returns(address[] memory){
        return tokenStrategies[_token].addresses;
    }
    
    function getStrategiesAllocations(address _token) external view returns( Strategies memory){
        return tokenStrategies[_token];
    }
}
