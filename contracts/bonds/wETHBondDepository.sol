// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./BondDepository.sol";
import "../librairies/FixedPoint256x256.sol";
import "../interfaces/IOlympusTreasury.sol";
import "../oracles/interfaces/AggregatorV3Interface.sol";

contract wETHOlympusBondDepository is BondDepository {
    using FixedPoint256x256 for *;
    using SafeERC20 for IERC20;

    AggregatorV3Interface internal priceFeed;

    /* ======== INITIALIZATION ======== */

    constructor(
        address _OHM,
        address _principle,
        address _treasury,
        address _DAO,
        address _feed
    ) BondDepository(_OHM, _principle, _treasury, _DAO) {
        priceFeed = AggregatorV3Interface(_feed);
    }

    /**
     *  @notice initializes bond parameters
     *  @param _controlVariable uint
     *  @param _vestingTerm uint
     *  @param _minimumPrice uint
     *  @param _maxPayout uint
     *  @param _maxDebt uint
     *  @param _initialDebt uint
     */
    function initializeBondTerms(
        uint256 _controlVariable,
        uint256 _vestingTerm,
        uint256 _minimumPrice,
        uint256 _maxPayout,
        uint256 _maxDebt,
        uint256 _initialDebt
    ) external onlyPolicy {
        require(_terms.controlVariable == 0, "Debt must be 0 for initialization");
        _terms = Terms({
            controlVariable: _controlVariable,
            vestingTerm: _vestingTerm,
            minimumPrice: _minimumPrice,
            maxPayout: _maxPayout,
            maxDebt: _maxDebt
        });
        totalDebt = _initialDebt;
        lastDecay = block.number;
    }

    /* ======== POLICY FUNCTIONS ======== */

    enum PARAMETER {
        VESTING,
        PAYOUT,
        DEBT,
        MINPRICE
    }

    /**
     *  @notice set parameters for new bonds
     *  @param _parameter PARAMETER
     *  @param _input uint
     */
    function setBondTerms(PARAMETER _parameter, uint256 _input) external onlyPolicy {
        if (_parameter == PARAMETER.VESTING) {
            // 0
            require(_input >= 10000, "Vesting must be longer than 36 hours");
            _terms.vestingTerm = _input;
        } else if (_parameter == PARAMETER.PAYOUT) {
            // 1
            require(_input <= 1000, "Payout cannot be above 1 percent");
            _terms.maxPayout = _input;
        } else if (_parameter == PARAMETER.DEBT) {
            // 2
            _terms.maxDebt = _input;
        } else if (_parameter == PARAMETER.MINPRICE) {
            // 3
            _terms.minimumPrice = _input;
        }
    }

    function terms() external view returns (Terms memory) {
        return _terms;
    }

    /**
     *  @notice get asset price from chainlink
     */
    function assetPrice() public view returns (int256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }

    /* ======== OVERRIDE FUNCTIONS ======== */

    function _valueOf(uint256 amount) internal view override returns (uint256) {
        return
            (amount * (10**IERC20Metadata(OHM).decimals())) /
            (10**IERC20Metadata(principle).decimals());
    }

    function _deposit(
        uint256 amount,
        uint256,
        uint256 payout
    ) internal override {
        /**
            asset carries risk and is not minted against
            asset transfered to treasury and rewards minted as payout
         */
        IERC20(principle).safeTransferFrom(msg.sender, treasury, amount);
        IOlympusTreasury(treasury).mintRewards(address(this), payout);
    }

    /**
     *  @notice calculate current bond premium
     *  @return price uint
     */
    function bondPrice() public view override returns (uint256 price) {
        price = (_terms.controlVariable * debtRatio()) / 1e5;
        if (price < _terms.minimumPrice) {
            price = _terms.minimumPrice;
        }
    }

    /**
     *  @notice calculate current bond price and remove floor if above
     *  @return price uint
     */
    function _bondPrice() internal override returns (uint256 price) {
        price = (_terms.controlVariable * debtRatio()) / 1e5;
        if (price < _terms.minimumPrice) {
            price = _terms.minimumPrice;
        } else if (_terms.minimumPrice != 0) {
            _terms.minimumPrice = 0;
        }
    }

    /**
     *  @notice converts bond price to DAI value
     *  @return price uint
     */
    function bondPriceInUSD() public view override returns (uint256 price) {
        price = bondPrice() * uint256(assetPrice()) * 1e6;
    }

    /**
     *  @notice debt ratio in same terms as reserve bonds
     *  @return uint
     */
    function standardizedDebtRatio() external view override returns (uint256) {
        return (debtRatio() * uint256(assetPrice())) / 1e8; // ETH feed is 8 decimals
    }
}
