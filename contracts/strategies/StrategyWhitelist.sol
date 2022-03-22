// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;
pragma abicoder v2;

import "hardhat/console.sol";
import "../ExodiaAccessControlInitializable.sol";

contract StrategyWhitelist is ExodiaAccessControlInitializable {
    mapping(address => bool) whitelist;

    function initialize(address _roles) external initializer {
        ExodiaAccessControlInitializable.initializeAccessControl(_roles);
    }

    function add(address _strategy) external onlyArchitect {
        require(_strategy != address(0), "WL: can't add null address");
        whitelist[_strategy] = true;
    }

    function remove(address _strategy) external onlyArchitect {
        whitelist[_strategy] = false;
    }

    function isWhitelisted(address _strategy) external view returns (bool) {
        return whitelist[_strategy];
    }
}
