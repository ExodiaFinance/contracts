// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;
pragma abicoder v2;

import "../ExodiaAccessControlInitializable.sol";
import "../interfaces/IERC20.sol";
import "./IAllocationCalculator.sol";
import "./StrategyWhitelist.sol";

struct Strategies {
    address[] addresses; // address of strategies
    uint256[] allocations; // sum up to 100_000, ratio of tokens going to the strategy
}

contract AllocationCalculator is ExodiaAccessControlInitializable, IAllocationCalculator {
    mapping(address => Strategies) tokenStrategies;
    StrategyWhitelist public whitelist;

    function initialize(address _whitelist, address _roles) external initializer {
        ExodiaAccessControlInitializable.initializeAccessControl(_roles);
        whitelist = StrategyWhitelist(_whitelist);
    }

    function setAllocation(
        address _token,
        address[] memory _strategies,
        uint256[] memory _allocations
    ) external onlyStrategist {
        for (uint256 i = 0; i < _strategies.length; i++) {
            require(
                whitelist.isWhitelisted(_strategies[i]),
                string(
                    abi.encodePacked(
                        "AllocCalc: one or more strategies are not whitelisted"
                    )
                )
            );
        }
        Strategies storage allocations = tokenStrategies[_token];
        allocations.addresses = _strategies;
        allocations.allocations = _allocations;
    }

    function setWhitelist(address _whitelist) external onlyArchitect {
        whitelist = StrategyWhitelist(_whitelist);
    }

    function calculateAllocation(address _token, uint256 _manageable)
        external
        view
        override
        returns (uint256[] memory, uint256)
    {
        Strategies memory strategies = tokenStrategies[_token];
        uint256[] memory allocations = new uint256[](strategies.allocations.length);
        uint256 allocated = 0;
        for (uint256 i = 0; i < allocations.length; i++) {
            uint256 allocation = (strategies.allocations[i] * _manageable) / 1e5;
            allocations[i] = allocation;
            allocated += allocation;
        }
        return (allocations, allocated);
    }

    function _isAllocatable(address _token) external returns (bool) {
        return tokenStrategies[_token].addresses.length > 0;
    }

    function getStrategies(address _token)
        external
        view
        override
        returns (address[] memory)
    {
        return tokenStrategies[_token].addresses;
    }

    function getStrategiesAllocations(address _token)
        external
        view
        returns (Strategies memory)
    {
        return tokenStrategies[_token];
    }
}
