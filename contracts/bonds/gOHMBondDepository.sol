// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.7.5;

import "./wETHBondDepository.sol";

interface ISpiritRouter {
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

contract GOHMBondDepository is wETHOlympusBondDepository {

    constructor(
        address _OHM,
        address _principle,
        address _treasury,
        address _DAO,
        address _feed
    ) wETHOlympusBondDepository(_OHM, _principle, _treasury, _DAO, _feed){}

    function updateFeed(address _feed) public onlyPolicy {
        priceFeed = AggregatorV3Interface(_feed);
    }
}
