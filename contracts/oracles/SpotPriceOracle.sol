// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "../Policy.sol";
import "./interfaces/AggregatorV3Interface.sol";


abstract contract SpotPriceOracle is AggregatorV3Interface, Policy{

    using SafeMath for uint;
    
    function latestRoundData() external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound) {
        return (uint80(0), getPrice(), uint(0), uint(0), uint80(0));
    }

    function latestAnswer() external view override returns(int256){
        return getPrice();
    }

    function getPrice() public view virtual returns (int256);

    function decimals()
    external
    pure
    override
    returns (
        uint8
    ){
        return 8;
    }

    function description()
    external
    pure
    override
    returns (
        string memory
    ){
        return "oracle using spot price UniV2";
    }

    function version()
    external
    view
    override
    returns (
        uint256
    ){
        return 1;
    }

    // getRoundData and latestRoundData should both raise "No data present"
    // if they do not have data to report, instead of returning unset values
    // which could be misinterpreted as actual reported values.
    function getRoundData(
        uint80 _roundId
    )
    external
    pure
    override
    returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ){
        require(false, "No data present");
    }

}
