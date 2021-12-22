// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.0;

import "./interfaces/AggregatorV3Interface.sol";
import "../interfaces/IUniswapV2Router.sol";
import "../Policy.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";


contract UniV2SpotPriceOracle is AggregatorV3Interface, Policy{

    using SafeMath for uint;
    
    address router;
    address[] path;
    address immutable token0;
    address immutable token1;

    constructor(address _token0, address _token1){
        token0 = _token0;
        token1 = _token1;
    }

    function updatePath(address _router, address[] calldata _path) external onlyPolicy {
        require(_path[0] == token0, "wrong input");
        require(_path[_path.length-1] == token1, "wrong output");
        path = _path;
        router = _router;
    }

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
    
    function getPrice() public view returns (int256){
        uint[] memory amountsOut = IUniswapV2Router(router).getAmountsOut(1e18, path);
        uint price = amountsOut[amountsOut.length - 1];
        price = price.mul(100);
        // returned price is 6 decimals, but chain link oracle returns 8 decimals
        return int256(price);
    }
    
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
