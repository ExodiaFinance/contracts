// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "../../IPriceOracle.sol";
import "../../../interfaces/IBalV2PriceOracle.sol";
import "../../../interfaces/AggregatorV3Interface.sol";
import "../../../../interfaces/IBPoolV2.sol";
import "../../../../interfaces/IBVaultV2.sol";
import "../../../../interfaces/IERC20.sol";

contract BalancerV2PriceOracle is IPriceOracle, Initializable, Ownable {
    using SafeMath for uint256;

    uint256 public constant VERSION = 2022022201;

    address public vault;
    uint256 public minimumUpdateInterval = 5 minutes;
    mapping(address => address) public denominatedOracles; // token => denominated oracle
    mapping(address => address) public tokenPools; // token => balancer pool

    event SetTokenOracle(
        address indexed token,
        address indexed tokenPool,
        address indexed denominatedOracle
    );

    /**
     * @dev sets up the Price Oracle
     * @param _vault balancer vault address
     * @param _minimumUpdateInterval how often to permit updates to the TWAP (seconds)
     *                               If set to 0, will use the default of 5 minutes
     */
    function initialize(address _vault, uint256 _minimumUpdateInterval)
        public
        initializer
    {
        require(_vault != address(0), "vault cannot be null address");

        _transferOwnership(_msgSender());
        vault = _vault;
        if (_minimumUpdateInterval != 0) {
            minimumUpdateInterval = _minimumUpdateInterval;
        }
    }

    /**
     * @dev add/update token oracle setting
     */
    function setTokenOracle(
        address _token,
        address _tokenPool,
        address _denominatedOracle
    ) external onlyOwner onlyInitializing {
        bytes32 poolId = IBPoolV2(_tokenPool).getPoolId();
        (IERC20[] memory tokens, , ) = IBVaultV2(vault).getPoolTokens(poolId);

        require(tokens.length == 2, "INVALID POOL");
        require(
            _token == address(tokens[0]) || _token == address(tokens[1]),
            "INVALID TOKENS"
        );

        denominatedOracles[_token] = _denominatedOracle;
        tokenPools[_token] = _tokenPool;

        emit SetTokenOracle(_token, _tokenPool, _denominatedOracle);
    }

    /****** OPERATIONAL METHODS ******/

    /**
     * @dev returns the TWAP for the provided pair as of the last update
     */
    function getSafePrice(address _token) public view returns (uint256 price) {
        require(
            tokenPools[_token] != address(0) && denominatedOracles[_token] != address(0),
            "UNSUPPORTED"
        );

        IBalV2PriceOracle.OracleAverageQuery[]
            memory query = new IBalV2PriceOracle.OracleAverageQuery[](1);
        query[0] = IBalV2PriceOracle.OracleAverageQuery(
            IBalV2PriceOracle.TWAP_VALUE.PAIR_PRICE,
            minimumUpdateInterval,
            10
        );
        uint256[] memory prices = IBalV2PriceOracle(tokenPools[_token])
            .getTimeWeightedAverage(query);
        uint256 tokenPairPrice = prices[0];

        int256 denominatedTokenPrice = AggregatorV3Interface(denominatedOracles[_token])
            .latestAnswer();
        uint8 denominatedTokenPriceDecimals = AggregatorV3Interface(
            denominatedOracles[_token]
        ).decimals();
        bytes32 poolId = IBPoolV2(tokenPools[_token]).getPoolId();
        (IERC20[] memory tokens, , ) = IBVaultV2(vault).getPoolTokens(poolId);

        if (_token == address(tokens[0])) {
            price =
                (uint256(denominatedTokenPrice) * (10**36)) /
                tokenPairPrice /
                (10**denominatedTokenPriceDecimals);
        } else if (_token == address(tokens[1])) {
            price =
                (uint256(denominatedTokenPrice) * tokenPairPrice) /
                (10**denominatedTokenPriceDecimals);
        }
    }

    /**
     * @dev returns the current "unsafe" price that can be easily manipulated
     */
    function getCurrentPrice(address _token) external view returns (uint256 price) {
        require(
            tokenPools[_token] != address(0) && denominatedOracles[_token] != address(0),
            "UNSUPPORTED"
        );

        int256 denominatedTokenPrice = AggregatorV3Interface(denominatedOracles[_token])
            .latestAnswer();
        uint8 denominatedTokenPriceDecimals = AggregatorV3Interface(
            denominatedOracles[_token]
        ).decimals();

        bytes32 poolId = IBPoolV2(tokenPools[_token]).getPoolId();
        uint256[] memory weights = IBPoolV2(tokenPools[_token]).getNormalizedWeights();
        (IERC20[] memory tokens, uint256[] memory balances, ) = IBVaultV2(vault)
            .getPoolTokens(poolId);

        if (_token == address(tokens[0])) {
            // price = balance1 / balance0 * weight0 / weight1 * usdPrice1
            // in denominated token price decimals
            uint256 assetValue = (balances[1] * uint256(denominatedTokenPrice)) /
                (10**tokens[1].decimals());
            // in denominated token price decimals
            uint256 tokenPrice = (assetValue * weights[0] * (10**tokens[0].decimals())) /
                weights[1] /
                balances[0];

            price = (tokenPrice * (10**18)) / (10**denominatedTokenPriceDecimals);
        } else if (_token == address(tokens[1])) {
            // price = balance0 / balance1 * weight1 / weight0 * usdPrice0
            // in denominated token price decimals
            uint256 assetValue = (balances[0] * uint256(denominatedTokenPrice)) /
                (10**tokens[0].decimals());
            // in denominated token price decimals
            uint256 tokenPrice = (assetValue * weights[1] * (10**tokens[1].decimals())) /
                weights[0] /
                balances[1];

            price = (tokenPrice * (10**18)) / (10**denominatedTokenPriceDecimals);
        }
    }

    /**
     * @dev updates the TWAP (if enough time has lapsed) and returns the current safe price
     */
    function updateSafePrice(address _token) external returns (uint256) {
        return getSafePrice(_token);
    }
}
