// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/AggregatorV3Interface.sol";

import "./SpotPriceOracle.sol";
import "./interfaces/IBalV2PriceOracle.sol";

import "hardhat/console.sol";

interface IFBeets {
    function vestingToken() external view returns (address);
}

contract fBEETSPriceOracle is SpotPriceOracle {
    using SafeMath for uint256;
    using Address for address;

    address vestingToken;
    address ftmUsdOracle;
    address fBeetsBar;

    constructor(address _ftmUsdOracle, address _fBeetsBar) SpotPriceOracle() {
        require(_vestingToken.isContract(), "vestingToken is not a contract");
        require(_ftmUsdOracle.isContract(), "FTM-USD oracle is not a contract");
        require(_fBeetsBar.isContract(), "fBeetsBar is not a contract");
        ftmUsdOracle = _ftmUsdOracle;
        fBeetsBar = _fBeetsBar;
        vestingToken = IFBeets(_fBeetsBar).vestingToken();
    }
    
    function updateSafePrice() public returns (int256) {
        IBalV2PriceOracle.OracleAverageQuery[]
            memory query = new IBalV2PriceOracle.OracleAverageQuery[](1);
        query[0] = IBalV2PriceOracle.OracleAverageQuery(
            IBalV2PriceOracle.TWAP_VALUE.BPT_PRICE,
            120,
            10
        );
        uint256[] memory prices = IBalV2PriceOracle(vestingToken).getTimeWeightedAverage(
            query
        );
        uint256 bptFtm = prices[0];
        int256 ftmUsd = AggregatorV3Interface(ftmUsdOracle).latestAnswer();
        uint256 fBeetsTotalSupply = IERC20(fBeetsBar).totalSupply();
        uint256 vestingTokenLocked = IERC20(vestingToken).balanceOf(fBeetsBar);
        uint256 bptFBeetsRatio = vestingTokenLocked.mul(1e18).div(fBeetsTotalSupply);
        uint256 price = bptFtm.mul(bptFBeetsRatio).mul(uint256(ftmUsd)).div(1e36);
        return int256(price);
    }
    
    // slower, but uses TWAP to prevent exploitation from flashloan exploits
    function getSafePrice() public view override returns (int256) {
        IBalV2PriceOracle.OracleAverageQuery[]
            memory query = new IBalV2PriceOracle.OracleAverageQuery[](1);
        query[0] = IBalV2PriceOracle.OracleAverageQuery(
            IBalV2PriceOracle.TWAP_VALUE.BPT_PRICE,
            120,
            10
        );
        uint256[] memory prices = IBalV2PriceOracle(vestingToken).getTimeWeightedAverage(
            query
        );
        uint256 bptFtm = prices[0];
        int256 ftmUsd = AggregatorV3Interface(ftmUsdOracle).latestAnswer();
        uint256 fBeetsTotalSupply = IERC20(fBeetsBar).totalSupply();
        uint256 vestingTokenLocked = IERC20(vestingToken).balanceOf(fBeetsBar);
        uint256 bptFBeetsRatio = vestingTokenLocked.mul(1e18).div(fBeetsTotalSupply);
        uint256 price = bptFtm.mul(bptFBeetsRatio).mul(uint256(ftmUsd)).div(1e36);
        return int256(price);
    }

    // fast but vulnerable to flashloan attacks
    function getCurrentPrice() public view override returns (int256) {
        uint256[] memory prices = IBalV2PriceOracle(vestingToken).getLatest(
            IBalV2PriceOracle.TWAP_VALUE.BPT_PRICE
        );
        uint256 bptFtm = prices[0];
        int256 ftmUsd = AggregatorV3Interface(ftmUsdOracle).latestAnswer();
        uint256 fBeetsTotalSupply = IERC20(fBeetsBar).totalSupply();
        uint256 vestingTokenLocked = IERC20(vestingToken).balanceOf(fBeetsBar);
        uint256 bptFBeetsRatio = vestingTokenLocked.mul(1e18).div(fBeetsTotalSupply);
        uint256 price = bptFtm.mul(bptFBeetsRatio).mul(uint256(ftmUsd)).div(1e36);
        return int256(price);
    }

    function description() external pure override returns (string memory) {
        return "Oracle using balancer TWAP and fBEETS index";
    }
}
