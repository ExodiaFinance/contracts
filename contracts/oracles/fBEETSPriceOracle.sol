// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/AggregatorV3Interface.sol";

import "./SpotPriceOracle.sol";
import "./interfaces/IBalV2PriceOracle.sol";

import "hardhat/console.sol";

contract fBEETSPriceOracle is SpotPriceOracle {

    using SafeMath for uint;
    
    address vestingToken;
    address ftmUsdOracle;
    address fBeetsBar;
    
    constructor(address _vestingToken, address _ftmUsdOracle, address _fBeetsBar)
    SpotPriceOracle()
    {
        vestingToken = _vestingToken;
        ftmUsdOracle = _ftmUsdOracle;
        fBeetsBar = _fBeetsBar;
    }

    function getPrice() public view override returns (int256){
        IBalV2PriceOracle.OracleAverageQuery[] memory query = new IBalV2PriceOracle.OracleAverageQuery[](1);
        query[0] = IBalV2PriceOracle.OracleAverageQuery(IBalV2PriceOracle.TWAP_VALUE.BPT_PRICE, 120, 10);
        uint[] memory prices = IBalV2PriceOracle(vestingToken).getTimeWeightedAverage(query);
        uint bptFtm = prices[0];
        int256 ftmUsd = AggregatorV3Interface(ftmUsdOracle).latestAnswer();
        uint fBeetsTotalSupply = IERC20(fBeetsBar).totalSupply();
        uint vestingTokenLocked = IERC20(vestingToken).balanceOf(fBeetsBar);
        uint bptFBeetsRatio = vestingTokenLocked.mul(1e18).div(fBeetsTotalSupply);
        uint price = bptFtm.mul(bptFBeetsRatio).mul(uint(ftmUsd)).div(1e36);
        return int256(price);
    }

    function description()
    external
    pure
    override
    returns (
        string memory
    ){
        return "Oracle using balancer TWAP and fBEETS index";
    }
}
