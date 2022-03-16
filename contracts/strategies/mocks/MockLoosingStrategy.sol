// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../IStrategy.sol";

import "hardhat/console.sol";

//This strategy does not return all the funds to simulate slippage
contract MockLoosingStrategy is IStrategy {
    mapping(address => uint256) depositedAmounts;
    uint256 returnRate;
    uint256 deployed;

    constructor(uint256 _returnRate) {
        returnRate = _returnRate;
    }

    function deploy(address _token) external override {
        IERC20(_token).transfer(address(0), deployed - balance(_token));
        uint256 internalBalance = IERC20(_token).balanceOf(address(this));
        if (internalBalance > deployed) {
            depositedAmounts[_token] += internalBalance - deployed;
        }
        deployed = internalBalance;
    }

    // Amount left in the contract may not be correct if reallocation occurs
    function withdrawTo(
        address _token,
        uint256 _amount,
        address _to
    ) external override returns (uint256) {
        int256 roi = int256(balance(_token)) - int256(depositedAmounts[_token]);
        if (int256(_amount) > roi) {
            depositedAmounts[_token] = uint256(
                int256(depositedAmounts[_token]) - (int256(_amount) - roi)
            );
        }
        IERC20 token = IERC20(_token);
        token.transfer(address(0), token.balanceOf(address(this)) - balance(_token));
        token.transfer(_to, _amount);
        deployed = token.balanceOf(address(this));
        return _amount;
    }

    function emergencyWithdrawTo(address _token, address _to)
        external
        override
        returns (uint256)
    {
        uint256 amount = deposited(_token);
        IERC20(_token).transfer(_to, amount);
        depositedAmounts[_token] = 0;
        return amount;
    }

    function collectProfits(address _token, address _to)
        external
        override
        returns (int256)
    {
        int256 profits = int256(balance(_token)) - int256(depositedAmounts[_token]);
        IERC20(_token).transfer(_to, uint256(profits));
        return profits;
    }

    function collectRewards(address _token, address _to)
        external
        override
        returns (address[] memory)
    {
        // This farm compounds rewards into the base token
        return new address[](0);
    }

    function deposited(address _token) public view override returns (uint256) {
        return depositedAmounts[_token];
    }

    function balance(address _token) public view override returns (uint256) {
        return (deployed * returnRate) / 100;
    }
}
