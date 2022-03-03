// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../../../../librairies/Initializable.sol";
import "../../../../librairies/FixedPoint.sol";
import "../IPriceOracle.sol";

/**
See https://github.com/Uniswap/v2-periphery/blob/master/contracts/examples/ExampleOracleSimple.sol
for the basis for the below contract. ExampleOracleSimple contract has been extended to support tracking multiple
pairs within the same contract.
*/

contract UniswapV2TWAPOracle is IPriceOracle, Initializable {
    using FixedPoint for *;

    uint256 public constant VERSION = 2022021401;

    struct LastValue {
        address token0;
        address token1;
        uint256 price0Cumulative;
        uint256 price1Cumulative;
        uint32 blockTimestamp;
        FixedPoint.uq112x112 price0Average;
        FixedPoint.uq112x112 price1Average;
    }

    event UpdatedValues(
        address indexed pair,
        FixedPoint.uq112x112 price0Average,
        FixedPoint.uq112x112 price1Average,
        uint256 price0Cumulative,
        uint256 price1Cumulative,
        uint32 blockTimestamp
    );

    mapping(IUniswapV2Pair => LastValue) public LAST_VALUES;

    address public TOKEN;

    uint256 public MINIMUM_UPDATE_INTERVAL = 5 minutes;

    /**
     * @dev sets up the Price Oracle
     *
     * @param _inToken the "target" token that is paired with FTM/wFTM
     * @param _minimumUpdateInterval how often to permit updates to the TWAP (seconds)
     *                               If set to 0, will use the default of 5 minutes
     */
    function initialize(address _inToken, uint256 _minimumUpdateInterval)
        public
        initializer
    {
        require(_inToken != address(0), "Base Token cannot be null address");
        TOKEN = _inToken;

        if (_minimumUpdateInterval != 0) {
            MINIMUM_UPDATE_INTERVAL = _minimumUpdateInterval;
        }
    }

    /****** OPERATIONAL METHODS ******/

    /**
     * @dev returns the TWAP for the provided pair as of the last update
     */
    function getSafePrice(address _pair) public view returns (uint256 _amountOut) {
        LastValue memory _lastValue = LAST_VALUES[IUniswapV2Pair(_pair)];

        uint256 amountIn = 10**IERC20Metadata(TOKEN).decimals();

        // calculate the value based upon the average cumulative prices
        // over the time period (TWAP)
        if (TOKEN == _lastValue.token0) {
            _amountOut = _lastValue.price0Average.mul(amountIn).decode144();
        } else {
            require(TOKEN == _lastValue.token1, "INVALID PAIR");
            _amountOut = _lastValue.price1Average.mul(amountIn).decode144();
        }
    }

    /**
     * @dev returns the current "unsafe" price that can be easily manipulated
     */
    function getCurrentPrice(address _pair) public view returns (uint256 _amountOut) {
        IUniswapV2Pair pair = IUniswapV2Pair(_pair);

        (uint256 reserves0, uint256 reserves1, ) = pair.getReserves();

        // simple spot pricing calculation
        if (TOKEN == pair.token0()) {
            _amountOut = _divide(
                reserves1,
                reserves0,
                IERC20Metadata(pair.token1()).decimals()
            );
        } else {
            require(TOKEN == pair.token1(), "INVALID PAIR");
            _amountOut = _divide(
                reserves0,
                reserves1,
                IERC20Metadata(pair.token0()).decimals()
            );
        }
    }

    /**
     * @dev updates the TWAP (if enough time has lapsed) and returns the current safe price
     */
    function updateSafePrice(address pair)
        public
       
        returns (uint256 _amountOut)
    {
        // loads the pair if it is not currently tracked
        _loadPair(IUniswapV2Pair(pair));

        (LastValue memory _lastValue, uint32 timeElapsed) = _getCurrentValues(
            IUniswapV2Pair(pair)
        );

        // ensure that at least one full MINIMUM_UPDATE_INTERVAL has passed since the last update
        if (timeElapsed < MINIMUM_UPDATE_INTERVAL) {
            return getSafePrice(pair);
        }

        // update the stored record
        LAST_VALUES[IUniswapV2Pair(pair)] = _lastValue;

        emit UpdatedValues(
            pair,
            _lastValue.price0Average,
            _lastValue.price1Average,
            _lastValue.price0Cumulative,
            _lastValue.price1Cumulative,
            _lastValue.blockTimestamp
        );

        return getSafePrice(pair);
    }

    /****** INTERNAL METHODS ******/

    // helper function that returns the current block timestamp within the range of uint32, i.e. [0, 2**32 - 1]
    function _currentBlockTimestamp() internal view returns (uint32) {
        return uint32(block.timestamp % 2**32);
    }

    /**
     * @dev fetches the current cumulative prices for token0 and token1 from the pair
     */
    function _currentCumulativePrices(IUniswapV2Pair pair)
        internal
        view
        returns (
            uint256 price0Cumulative,
            uint256 price1Cumulative,
            uint32 blockTimestamp
        )
    {
        blockTimestamp = _currentBlockTimestamp();
        price0Cumulative = IUniswapV2Pair(pair).price0CumulativeLast();
        price1Cumulative = IUniswapV2Pair(pair).price1CumulativeLast();

        // if time has elapsed since the last update on the pair, mock the accumulated price values
        (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) = IUniswapV2Pair(
            pair
        ).getReserves();

        if (blockTimestampLast != blockTimestamp) {
            // subtraction overflow is desired
            uint32 timeElapsed = blockTimestamp - blockTimestampLast;
            // addition overflow is desired
            // counterfactual
            price0Cumulative +=
                uint256(FixedPoint.fraction(reserve1, reserve0)._x) *
                timeElapsed;
            // counterfactual
            price1Cumulative +=
                uint256(FixedPoint.fraction(reserve0, reserve1)._x) *
                timeElapsed;
        }
    }

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

    /**
     * @dev retrieves an updated LastValue structure for current pair values
     * that can be used elsewhere in further calculations
     */
    function _getCurrentValues(IUniswapV2Pair pair)
        internal
        view
        returns (LastValue memory, uint32 timeElapsed)
    {
        LastValue memory _lastValue = LAST_VALUES[pair];

        (
            uint256 price0Cumulative,
            uint256 price1Cumulative,
            uint32 blockTimestamp
        ) = _currentCumulativePrices(pair);

        timeElapsed = blockTimestamp - _lastValue.blockTimestamp;

        // avoid divide by 0 error (ie, no time elapsed)
        if (timeElapsed == 0) {
            timeElapsed = 1;
        }

        // overflow is desired, casting never truncates
        // cumulative price is in (uq112x112 price * seconds) units so we simply wrap
        // it after division by time elapsed
        _lastValue.price0Average = FixedPoint.uq112x112(
            uint224((price0Cumulative - _lastValue.price0Cumulative) / timeElapsed)
        );

        _lastValue.price1Average = FixedPoint.uq112x112(
            uint224((price1Cumulative - _lastValue.price1Cumulative) / timeElapsed)
        );

        // update values
        _lastValue.price0Cumulative = price0Cumulative;
        _lastValue.price1Cumulative = price1Cumulative;
        _lastValue.blockTimestamp = blockTimestamp;

        return (_lastValue, timeElapsed);
    }

    /**
     * @dev checks to see if the pair is known to us, if not, populate the first TWAP entry
     */
    function _loadPair(IUniswapV2Pair pair) internal {
        if (LAST_VALUES[pair].blockTimestamp == 0) {
            (, , uint32 blockTimestampLast) = pair.getReserves();

            LAST_VALUES[pair] = LastValue({
                token0: pair.token0(),
                token1: pair.token1(),
                price0Cumulative: pair.price0CumulativeLast(),
                price1Cumulative: pair.price1CumulativeLast(),
                blockTimestamp: blockTimestampLast,
                price0Average: type(uint112).min.encode(),
                price1Average: type(uint112).min.encode()
            });
        }
    }
}
