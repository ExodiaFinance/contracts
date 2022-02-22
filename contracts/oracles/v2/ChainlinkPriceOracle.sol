// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./IPriceOracle.sol";

contract ChainlinkPriceOracle is IPriceOracle, Initializable, Ownable {
    uint256 public constant VERSION = 2022021401;

    address public BASE_PRICE_FEED;

    uint8 public decimals = 18;

    event UpdateValues(address indexed feed);
    event OutputDecimalsUpdated(uint8 _old, uint8 _new);

    function initialize(address _base_price_feed, uint256 _unused) public initializer {
        require(
            _base_price_feed != address(0),
            "FTM PRICE FEED cannot be the null address"
        );
        BASE_PRICE_FEED = _base_price_feed;
        _unused; // maintain compatability with interface
        _transferOwnership(_msgSender());
    }

    function getSafePrice(address _feed) public view returns (uint256 _amountOut) {
        return getCurrentPrice(_feed);
    }

    function getCurrentPrice(address _feed) public view returns (uint256 _amountOut) {
        _amountOut = _divide(_feedPrice(_feed), _feedPrice(BASE_PRICE_FEED), decimals);
    }

    function setOutputDecimals(uint8 _decimals) public onlyOwner whenInitialized {
        uint8 _old = _decimals;
        decimals = _decimals;
        emit OutputDecimalsUpdated(_old, _decimals);
    }

    function updateSafePrice(address _feed) public returns (uint256 _amountOut) {
        emit UpdateValues(_feed); // keeps this mutable so it matches the interface

        return getCurrentPrice(_feed);
    }

    /****** INTERNAL METHODS ******/

    /**
     * @dev internal method that does quick division using the set precision
     */
    function _divide(
        uint256 a,
        uint256 b,
        uint8 precision
    ) internal pure returns (uint256) {
        return (a * (10**precision)) / b;
    }

    function _feedPrice(address _feed) internal view returns (uint256 latestUSD) {
        (, int256 _latestUSD, , , ) = AggregatorV3Interface(_feed).latestRoundData();
        return uint256(_latestUSD);
    }
}
