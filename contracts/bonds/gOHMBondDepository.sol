// SPDX-License-Identifier: MIT
pragma solidity ^0.7.5;

import "./wETHBondDepository.sol";

contract GOHMBondDepository is wETHOlympusBondDepository {
    constructor(
        address _OHM,
        address _principle,
        address _treasury,
        address _DAO,
        address _feed
    ) wETHOlympusBondDepository(_OHM, _principle, _treasury, _DAO, _feed) {}

    function updateFeed(address _feed) public onlyPolicy {
        priceFeed = AggregatorV3Interface(_feed);
    }
}
