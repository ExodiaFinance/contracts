// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "../../../../ExodiaAccessControlInitializable.sol";

import "../IPriceOracle.sol";
import "../../../../interfaces/IERC20.sol";

contract UniswapV2LPPriceOracle is IPriceOracle, ExodiaAccessControlInitializable {
    using SafeMath for uint256;

    uint256 public constant VERSION = 2022030701;
    address public constant FTM = address(0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83);

    struct LPOracleSetting {
        address token0Oracle;
        address token1Oracle;
    }

    mapping(address => LPOracleSetting) public oracleSettings; // lp token => lp oracle setting
    uint256 public ratioDiffLimitNumerator;
    uint256 public ratioDiffLimitDenominator;

    event SetTokenOracle(
        address indexed token,
        address indexed token0Oracle,
        address indexed token1Oracle
    );
    event SetRatioDiffLimit(
        uint256 ratioDiffLimitNumerator,
        uint256 ratioDiffLimitDenominator
    );

    /**
     * @dev sets up the Price Oracle
     * @param _roles exodia roles address
     */
    function initialize(address _roles) public initializer {
        __ExodiaAccessControl__init(_roles);
    }

    /**
     * @dev add/update token oracle setting
     */
    function setTokenOracle(address _lpToken, LPOracleSetting memory _setting)
        external
        onlyArchitect
    {
        require(
            (IUniswapV2Pair(_lpToken).token0() == FTM ||
                _setting.token0Oracle != address(0)) &&
                (IUniswapV2Pair(_lpToken).token1() == FTM ||
                    _setting.token1Oracle != address(0)),
            "INVALID SETTING"
        );

        oracleSettings[_lpToken] = _setting;

        emit SetTokenOracle(_lpToken, _setting.token0Oracle, _setting.token1Oracle);
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
    function getSafePrice(address _lpToken) public view returns (uint256 price) {
        LPOracleSetting memory setting = oracleSettings[_lpToken];
        require(
            address(setting.token0Oracle) != address(0) ||
                address(setting.token1Oracle) != address(0),
            "UNSUPPORTED"
        );
        IERC20 token0 = IERC20(IUniswapV2Pair(_lpToken).token0());
        IERC20 token1 = IERC20(IUniswapV2Pair(_lpToken).token1());
        uint256 price0 = _getTokenCurrentPrice(
            IPriceOracle(setting.token0Oracle),
            token0
        );
        uint256 price1 = _getTokenCurrentPrice(
            IPriceOracle(setting.token1Oracle),
            token1
        );

        uint256 totalSupply = IUniswapV2Pair(_lpToken).totalSupply();
        (uint256 r0, uint256 r1, ) = IUniswapV2Pair(_lpToken).getReserves();
        uint256 decimal0 = token0.decimals();
        uint256 decimal1 = token1.decimals();

        r0 = (r0 * (10**18)) / (10**decimal0);
        r1 = (r1 * (10**18)) / (10**decimal1);

        _checkRatio(r0, r1, price0, price1);

        price = (r0 * price0 + r1 * price1) / totalSupply;
    }

    /**
     * @dev returns the current "unsafe" price that can be easily manipulated
     */
    function getCurrentPrice(address _lpToken) external view returns (uint256 price) {
        return getSafePrice(_lpToken);
    }

    /**
     * @dev updates the TWAP (if enough time has lapsed) and returns the current safe price
     */
    function updateSafePrice(address _lpToken) external returns (uint256) {
        return getSafePrice(_lpToken);
    }

    // internal functions

    function _getTokenSafePrice(IPriceOracle oracle, IERC20 token)
        internal
        view
        returns (uint256 price)
    {
        price = 10**18;
        if (FTM != address(token)) {
            price = IPriceOracle(oracle).getSafePrice(address(token));
        }
    }

    function _getTokenCurrentPrice(IPriceOracle oracle, IERC20 token)
        internal
        view
        returns (uint256 price)
    {
        price = 10**18;
        if (FTM != address(token)) {
            price = IPriceOracle(oracle).getCurrentPrice(address(token));
        }
    }

    function _checkRatio(
        uint256 r0,
        uint256 r1,
        uint256 p0,
        uint256 p1
    ) internal view {
        uint256 v0 = r0 * p0;
        uint256 v1 = r1 * p1;
        uint256 diffLimit = (v0 * ratioDiffLimitNumerator) / ratioDiffLimitDenominator;

        require(v1 < v0 + diffLimit && v0 < v1 + diffLimit, "INVALID RATIO");
    }
}
