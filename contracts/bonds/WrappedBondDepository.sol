// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./wETHBondDepository.sol";
import "../interfaces/IWOHM.sol";

contract WrappedBondDepository is wETHOlympusBondDepository {
    using SafeERC20 for IERC20;

    address public wOHM;

    constructor(
        address _OHM,
        address _principle,
        address _treasury,
        address _DAO,
        address _feed,
        address _wOHM
    ) wETHOlympusBondDepository(_OHM, _principle, _treasury, _DAO, _feed) {
        wOHM = _wOHM;
    }

    function updateFeed(address _feed) public onlyPolicy {
        priceFeed = AggregatorV3Interface(_feed);
    }

    function _deposit(
        uint256 amount,
        uint256,
        uint256 payout
    ) internal override returns (uint256) {
        /**
            asset carries risk and is not minted against
            asset transfered to treasury and rewards minted as payout
         */
        IERC20(principle).safeTransferFrom(msg.sender, treasury, amount);
        IOlympusTreasury(treasury).mintRewards(address(this), payout);

        IERC20(OHM).approve(wOHM, payout);
        return IWOHM(wOHM).wrapFromOHM(payout);
    }

    function stakeOrSend(
        address _recipient,
        bool,
        uint256 _amount
    ) internal override returns (uint256) {
        IERC20(wOHM).transfer(_recipient, _amount); // send payout
        return _amount;
    }

    /**
     *  @notice calculate interest due for new bond
     *  @param _value uint
     *  @return uint
     */
    function wOHMPayoutFor(uint256 _value) public view returns (uint256) {
        uint256 payout = payoutFor(_value);
        return IWOHM(wOHM).wOHMValue(payout);
    }
}
