// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "../../../../ExodiaAccessControlInitializable.sol";
import "../IPriceOracle.sol";

contract GOHMPriceOracle is IPriceOracle, ExodiaAccessControlInitializable {
    
    AggregatorV3Interface immutable ohmFeed;
    AggregatorV3Interface immutable indexFeed;
    
    function initialize(address _ohmFeed, address _indexFeed) public initializer
        SpotPriceOracle()
    {
        ohmFeed = AggregatorV3Interface(_ohmFeed);
        indexFeed = AggregatorV3Interface(_indexFeed);
    }

    function getSafePrice(address _token) public view returns (uint256 _amountOut) {
        return getCurrentPrice(_token);
    }
    
    function getCurrentPrice(address _token) public view returns (uint256 _amountOut) {
        int256 ohmPrice = ohmFeed.latestAnswer();
        int256 index = indexFeed.latestAnswer();
        return ohmPrice * index * 10;
    }
    
    function updateSafePrice(address _feed) public returns (uint256 _amountOut) {
        emit UpdateValues(_feed); // keeps this mutable so it matches the interface
        return getCurrentPrice(_feed);
    }
}
