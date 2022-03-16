// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SpotPriceOracle.sol";

contract GOHMPriceOracle is SpotPriceOracle {
    AggregatorV3Interface immutable ohmFeed;
    AggregatorV3Interface immutable indexFeed;

    constructor(address _ohmFeed, address _indexFeed) SpotPriceOracle() {
        ohmFeed = AggregatorV3Interface(_ohmFeed);
        indexFeed = AggregatorV3Interface(_indexFeed);
    }

    function getPrice() public view override returns (int256) {
        int256 ohmPrice = ohmFeed.latestAnswer();
        int256 index = indexFeed.latestAnswer();
        return (ohmPrice * index) / 1e9;
    }

    function description() external pure override returns (string memory) {
        return "Oracle using OHMv2 price and OHM index feed";
    }
}
