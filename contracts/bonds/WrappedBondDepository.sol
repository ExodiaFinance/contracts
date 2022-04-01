// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./wETHBondDepository.sol";
import "../interfaces/IWOHM.sol";

contract WrappedBondDepository is wETHOlympusBondDepository {
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

    function stakeOrSend(
        address _recipient,
        bool _stake,
        uint256 _amount
    ) internal override returns (uint256 stakedAmount) {
        if (!_stake) {
            // if user does not want to stake
            IERC20(OHM).transfer(_recipient, _amount); // send payout
            stakedAmount = _amount;
        } else {
            IERC20(OHM).approve(wOHM, _amount);
            stakedAmount = IWOHM(wOHM).wrapFromOHM(_amount);
            IERC20(wOHM).transfer(_recipient, stakedAmount); // send payout
        }
    }
}
