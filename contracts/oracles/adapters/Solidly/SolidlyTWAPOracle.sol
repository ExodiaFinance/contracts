// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../../ExodiaAccessControlInitializable.sol";
import "../../interfaces/SolidlyBaseV1Pair.sol";
import "../IPriceOracle.sol";
import "../../PriceProvider.sol";

contract SolidlyTWAPOracle is IPriceOracle, ExodiaAccessControlInitializable {
    mapping(address => SolidlyBaseV1Pair) public pairForToken;
    address BASE_TOKEN;
    IPriceProvider priceProvider;

    function initialize(
        address _baseToken,
        address _priceProvider,
        address _roles
    ) public initializer {
        ExodiaAccessControlInitializable.initializeAccessControl(_roles);
        priceProvider = IPriceProvider(_priceProvider);
        BASE_TOKEN = _baseToken;
    }

    function setPair(address _token, address _pair) external onlyArchitect {
        pairForToken[_token] = SolidlyBaseV1Pair(_pair);
    }

    function getSafePrice(address _token) public view returns (uint256) {
        SolidlyBaseV1Pair pair = pairForToken[_token];
        uint256 amountOut = pair.current(_token, 10**ERC20(_token).decimals());
        if (_token == pair.token0()) {
            return _basePrice(pair.token1(), amountOut);
        }
        return _basePrice(pair.token0(), amountOut);
    }

    function _basePrice(address _token, uint256 _amount) internal view returns (uint256) {
        if (_token == BASE_TOKEN) {
            return _amount;
        }
        return
            (_amount * priceProvider.getSafePrice(_token)) / 10**ERC20(_token).decimals();
    }

    function getCurrentPrice(address _token) external view returns (uint256 _amountOut) {
        return getSafePrice(_token);
    }

    function updateSafePrice(address _token) external returns (uint256 _amountOut) {
        return getSafePrice(_token);
    }

    function VERSION() external view returns (uint256) {
        return 1;
    }
}
