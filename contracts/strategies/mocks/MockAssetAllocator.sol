// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "../../mocks/MockERC20.sol";

import "hardhat/console.sol";

contract MockAssetAllocator {
    mapping(address => int256) tokenSlip;
    mapping(address => uint256) deposited;

    function rebalance(address _token, uint256 _amount) external returns (uint256) {
        _slippage(_token);
        uint256 balance = allocatedBalance(_token);
        if (balance > _amount) {
            IERC20(_token).transfer(msg.sender, balance - _amount);
        } else if (balance < _amount) {
            IERC20(_token).transferFrom(msg.sender, address(this), _amount - balance);
        }
        deposited[_token] = allocatedBalance(_token);
        return allocatedBalance(_token);
    }

    function allocate(address _token, uint256 _amount) external {
        if (_amount > deposited[_token]) {
            IERC20(_token).transferFrom(
                msg.sender,
                address(this),
                _amount - deposited[_token]
            );
            deposited[_token] = _amount;
        }
    }

    function _slippage(address _token) internal {
        int256 slippage = tokenSlip[_token];
        if (slippage > 0) {
            loose(_token, uint256(slippage));
        } else {
            profits(_token, uint256(slippage * -1));
        }
    }

    function allocatedBalance(address _token) public returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }

    function profits(address _token, uint256 _amount) public {
        MockToken(_token).mint(address(this), _amount);
    }

    function loose(address _token, uint256 _amount) public {
        MockToken(_token).burn(address(this), _amount);
    }

    function slip(address _token, int256 _amount) external {
        tokenSlip[_token] = _amount;
    }

    function collectRewards(address _token) external {}
}
