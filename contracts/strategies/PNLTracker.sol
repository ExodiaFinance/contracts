// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;
pragma abicoder v2;

import "../ExodiaAccessControlInitializable.sol";

contract PNLTracker is ExodiaAccessControlInitializable {
    
    mapping(uint => mapping(address => int)) public weeksPnl;
    
    event PNL(uint indexed _week, address indexed _token, int _pnl);
    
    function initialize(address _roles) external initializer {
        ExodiaAccessControlInitializable.initializeAccessControl(_roles);
    }
    
    function track(address _token, int _pnl) external onlyMachine {
        uint week = block.timestamp / 1 weeks;
        weeksPnl[week][_token] += _pnl;
        emit PNL(week, _token, _pnl);
    }
    
    function pnlAt(address _token, uint _timestamp) external view returns (int) {
        uint week = _timestamp / 1 weeks;
        return weeksPnl[week][_token];
    }
    
}
