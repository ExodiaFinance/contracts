// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../../../../ExodiaAccessControlInitializable.sol";

import "../IPriceOracle.sol";
import "../../IPriceProvider.sol";
import "../../../interfaces/IBalV2PriceOracle.sol";
import "../../../../interfaces/IBPoolV2.sol";
import "../../../../interfaces/IBVaultV2.sol";
import "../../../../interfaces/IERC20.sol";

contract BalancerV2WeightedPoolPriceOracle is
    IPriceOracle,
    ExodiaAccessControlInitializable
{
    using SafeMath for uint256;

    uint256 public constant VERSION = 2022040401;
    address public constant FTM = address(0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83);

    IBVaultV2 public vault;
    IPriceProvider public priceProvider;
    uint256 public ratioDiffLimitNumerator;
    uint256 public ratioDiffLimitDenominator;

    event SetRatioDiffLimit(
        uint256 ratioDiffLimitNumerator,
        uint256 ratioDiffLimitDenominator
    );

    /**
     * @dev sets up the Price Oracle
     * @param _roles exodia roles address
     * @param _vault balancer vault address
     */
    function initialize(
        address _roles,
        address _vault,
        address _priceProvider
    ) public initializer {
        require(_vault != address(0), "vault cannot be null address");
        require(_priceProvider != address(0), "price provider cannot be null address");

        ExodiaAccessControlInitializable.initializeAccessControl(_roles);

        vault = IBVaultV2(_vault);
        priceProvider = IPriceProvider(_priceProvider);
    }

    /**
     * @dev set ratio difference limit
     */
    function setRatioDiffLimit(
        uint256 _ratioDiffLimitNumerator,
        uint256 _ratioDiffLimitDenominator
    ) external onlyArchitect {
        require(
            _ratioDiffLimitNumerator <= _ratioDiffLimitDenominator,
            "INVALID RATIO DIFF LIMIT"
        );

        ratioDiffLimitNumerator = _ratioDiffLimitNumerator;
        ratioDiffLimitDenominator = _ratioDiffLimitDenominator;

        emit SetRatioDiffLimit(_ratioDiffLimitNumerator, _ratioDiffLimitDenominator);
    }

    /****** OPERATIONAL METHODS ******/

    /**
     * @dev returns the TWAP for the provided pair as of the last update
     */
    function getSafePrice(address _bpt) public view returns (uint256) {
        return _getLPPrice(_bpt, true);
    }

    /**
     * @dev returns the current "unsafe" price that can be easily manipulated
     */
    function getCurrentPrice(address _bpt) external view returns (uint256) {
        return _getLPPrice(_bpt, false);
    }

    /**
     * @dev updates the TWAP (if enough time has lapsed) and returns the current safe price
     */
    function updateSafePrice(address _bpt) external returns (uint256) {
        return getSafePrice(_bpt);
    }

    // internal functions

    function _getTokenSafePrice(address token) internal view returns (uint256 price) {
        price = 10**18;
        if (FTM != token) {
            price = priceProvider.getSafePrice(token);
        }
    }

    function _getTokenCurrentPrice(address token) internal view returns (uint256 price) {
        price = 10**18;
        if (FTM != token) {
            price = priceProvider.getCurrentPrice(token);
        }
    }

    function _getLPPrice(address _bpt, bool isSafePrice)
        internal
        view
        returns (uint256 price)
    {
        bytes32 poolId = IBPoolV2(_bpt).getPoolId();
        uint256[] memory weights = IBPoolV2(_bpt).getNormalizedWeights();
        uint256 totalSupply = IBPoolV2(_bpt).totalSupply();
        (IERC20[] memory tokens, uint256[] memory balances, ) = vault.getPoolTokens(
            poolId
        );

        uint256 totalFTM;
        uint256[] memory prices = new uint256[](tokens.length);
        // update balances in 18 decimals
        for (uint256 i = 0; i < tokens.length; i++) {
            balances[i] = (balances[i] * (10**18)) / (10**IERC20(tokens[i]).decimals());
            prices[i] = isSafePrice
                ? _getTokenSafePrice(address(tokens[i]))
                : _getTokenCurrentPrice(address(tokens[i]));

            if (i >= 1) {
                _checkRatio(
                    (balances[i - 1] * 10**18) / weights[i - 1],
                    (balances[i] * 10**18) / weights[i],
                    prices[i - 1],
                    prices[i]
                );
            }

            totalFTM += balances[i] * prices[i];
        }

        price = totalFTM / totalSupply;
    }

    function _checkRatio(
        uint256 reserve0,
        uint256 reserve1,
        uint256 price0,
        uint256 price1
    ) internal view {
        uint256 value0 = reserve0 * price0;
        uint256 value1 = reserve1 * price1;
        uint256 diffLimit = (value0 * ratioDiffLimitNumerator) /
            ratioDiffLimitDenominator;

        require(
            value1 < value0 + diffLimit && value0 < value1 + diffLimit,
            "INVALID RATIO"
        );
    }
}
