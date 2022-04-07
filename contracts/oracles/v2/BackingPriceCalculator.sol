// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../ExodiaAccessControlInitializable.sol";

import "../../interfaces/IERC20.sol";
import "../../treasury/ITreasuryTracker.sol";
import "./IPriceProvider.sol";
import "./IBackingPriceCalculator.sol";

contract BackingPriceCalculator is
    ExodiaAccessControlInitializable,
    IBackingPriceCalculator
{
    event SetTreasuryTracker(address treasuryTracker);
    event SetPriceProvider(address priceProvider);
    event SetEXODAddress(address exod);

    ITreasuryTracker public treasuryTracker;
    IPriceProvider public priceProvider;
    address public exod;
    uint256 public backingPrice;

    /**
     * @dev sets up the Price Oracle
     * @param _roles exodia roles address
     */
    function initialize(
        address _roles,
        address _treasuryTracker,
        address _priceProvider,
        address _exod
    ) public initializer {
        require(
            _treasuryTracker != address(0),
            "treasury tracker cannot be null address"
        );
        require(_priceProvider != address(0), "price provider cannot be null address");
        require(_exod != address(0), "EXOD cannot be null address");

        ExodiaAccessControlInitializable.initializeAccessControl(_roles);
        treasuryTracker = ITreasuryTracker(_treasuryTracker);
        priceProvider = IPriceProvider(_priceProvider);
        exod = _exod;
    }

    function setTreasuryTracker(address _treasuryTracker) external onlyArchitect {
        require(
            _treasuryTracker != address(0),
            "treasury tracker cannot be null address"
        );

        treasuryTracker = ITreasuryTracker(_treasuryTracker);
        emit SetTreasuryTracker(_treasuryTracker);
    }

    function setPriceProvider(address _priceProvider) external onlyArchitect {
        require(_priceProvider != address(0), "price provider cannot be null address");

        priceProvider = IPriceProvider(_priceProvider);
        emit SetPriceProvider(_priceProvider);
    }

    function setEXODAddress(address _exod) external onlyArchitect {
        require(_exod != address(0), "EXOD cannot be null address");

        exod = _exod;
        emit SetEXODAddress(_exod);
    }

    function fetchBackingPrice() external override returns (uint256) {
        (address[] memory tokens, uint256[] memory balances) = treasuryTracker.balances();

        uint256 treasuryFTMBalance; // 18 decimals
        for (uint256 i = 0; i < tokens.length; i++) {
            treasuryFTMBalance +=
                (balances[i] * priceProvider.getSafePrice(tokens[i])) /
                (10**IERC20(tokens[i]).decimals());
        }

        backingPrice =
            (treasuryFTMBalance * (10**IERC20(exod).decimals())) /
            IERC20(exod).totalSupply();

        return backingPrice;
    }

    function getBackingPrice() external view override returns (uint256) {
        return backingPrice;
    }
}
