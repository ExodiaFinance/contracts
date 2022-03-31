// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./BondDepository.sol";
import "../librairies/FixedPoint256x256.sol";
import "../interfaces/IOlympusTreasury.sol";
import "../interfaces/IBondCalculator.sol";

contract OlympusBondDepository is BondDepository {
    using FixedPoint256x256 for *;
    using SafeERC20 for IERC20;

    bool public immutable isLiquidityBond; // LP and Reserve bonds are treated slightly different
    address public immutable bondCalculator; // calculates value of LP tokens

    struct ExtraTerms {
        uint256 fee; // as % of bond payout, in hundreths. ( 500 = 5% = 0.05 for every 1 paid)
    }

    ExtraTerms internal _extraTerms; // as % of bond payout, in hundreths. ( 500 = 5% = 0.05 for every 1 paid)

    /* ======== INITIALIZATION ======== */

    constructor(
        address _OHM,
        address _principle,
        address _treasury,
        address _DAO,
        address _bondCalculator
    ) BondDepository(_OHM, _principle, _treasury, _DAO) {
        // bondCalculator should be address(0) if not LP bond
        bondCalculator = _bondCalculator;
        isLiquidityBond = (_bondCalculator != address(0));
    }

    /**
     *  @notice initializes bond parameters
     *  @param _controlVariable uint
     *  @param _vestingTerm uint
     *  @param _minimumPrice uint
     *  @param _maxPayout uint
     *  @param _fee uint
     *  @param _maxDebt uint
     *  @param _initialDebt uint
     */
    function initializeBondTerms(
        uint256 _controlVariable,
        uint256 _vestingTerm,
        uint256 _minimumPrice,
        uint256 _maxPayout,
        uint256 _fee,
        uint256 _maxDebt,
        uint256 _initialDebt
    ) external onlyPolicy {
        require(_terms.controlVariable == 0, "Bonds must be initialized from 0");
        _terms = Terms({
            controlVariable: _controlVariable,
            vestingTerm: _vestingTerm,
            minimumPrice: _minimumPrice,
            maxPayout: _maxPayout,
            maxDebt: _maxDebt
        });
        _extraTerms = ExtraTerms({fee: _fee});
        totalDebt = _initialDebt;
        lastDecay = block.number;
    }

    /* ======== POLICY FUNCTIONS ======== */

    enum PARAMETER {
        VESTING,
        PAYOUT,
        FEE,
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
        } else if (_parameter == PARAMETER.FEE) {
            // 2
            require(_input <= 10000, "DAO fee cannot exceed payout");
            _extraTerms.fee = _input;
        } else if (_parameter == PARAMETER.DEBT) {
            // 3
            _terms.maxDebt = _input;
        } else if (_parameter == PARAMETER.MINPRICE) {
            // 4
            _terms.minimumPrice = _input;
        }
    }

    struct TermsResponse {
        uint256 controlVariable; // scaling variable for price
        uint256 vestingTerm; // in blocks
        uint256 minimumPrice; // vs principle value
        uint256 maxPayout; // in thousandths of a %. i.e. 500 = 0.5%
        uint256 fee; // as % of bond payout, in hundreths. ( 500 = 5% = 0.05 for every 1 paid)
        uint256 maxDebt; // 9 decimal debt ratio, max % total supply created as debt
    }

    function terms() external view returns (TermsResponse memory) {
        return
            TermsResponse({
                controlVariable: _terms.controlVariable,
                vestingTerm: _terms.vestingTerm,
                minimumPrice: _terms.minimumPrice,
                maxPayout: _terms.maxPayout,
                fee: _extraTerms.fee,
                maxDebt: _terms.maxDebt
            });
    }

    /* ======== OVERRIDE FUNCTIONS ======== */

    function _valueOf(uint256 amount) internal view override returns (uint256) {
        return IOlympusTreasury(treasury).valueOf(principle, amount);
    }

    function _deposit(
        uint256 amount,
        uint256 value,
        uint256 payout
    ) internal override {
        // profits are calculated
        uint256 fee = (payout * _extraTerms.fee) / 10000;
        uint256 profit = value - payout - fee;

        /**
            principle is transferred in
            approved and
            deposited into the treasury, returning (_amount - profit) OHM
         */
        IERC20(principle).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(principle).approve(address(treasury), amount);
        IOlympusTreasury(treasury).deposit(amount, principle, profit);

        if (fee != 0) {
            // fee is transferred to dao
            IERC20(OHM).safeTransfer(DAO, fee);
        }
    }

    /**
     *  @notice converts bond price to DAI value
     *  @return price uint
     */
    function bondPriceInUSD() public view override returns (uint256 price) {
        if (isLiquidityBond) {
            price =
                (bondPrice() * IBondCalculator(bondCalculator).markdown(principle)) /
                1e9;
        } else {
            price = (bondPrice() * 10**IERC20Metadata(principle).decimals()) / 1e9;
        }
    }

    /**
     *  @notice debt ratio in same terms for reserve or liquidity bonds
     *  @return uint
     */
    function standardizedDebtRatio() external view override returns (uint256) {
        if (isLiquidityBond) {
            return
                (debtRatio() * IBondCalculator(bondCalculator).markdown(principle)) / 1e9;
        } else {
            return debtRatio();
        }
    }
}
