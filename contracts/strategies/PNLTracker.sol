// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;
pragma abicoder v2;

import "../ExodiaAccessControlInitializable.sol";

contract PNLTracker is ExodiaAccessControlInitializable {
    mapping(uint256 => mapping(address => int256)) public weeksPnl;
    uint256 public FIRST_WEEK;

    event PNL(uint256 indexed _week, address indexed _token, int256 _pnl);

    function initialize(address _roles) external initializer {
        ExodiaAccessControlInitializable.initializeAccessControl(_roles);
        FIRST_WEEK = getCurrentWeek();
    }

    function getCurrentWeek() public view returns (uint256) {
        return block.timestamp / 1 weeks;
    }

    function track(address _token, int256 _pnl) external onlyMachine {
        uint256 week = getCurrentWeek();
        weeksPnl[week][_token] += _pnl;
        emit PNL(week, _token, _pnl);
    }

    function pnlAt(address _token, uint256 _timestamp) external view returns (int256) {
        uint256 week = getCurrentWeek();
        return weeksPnl[week][_token];
    }
}
