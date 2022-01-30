// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../IStrategy.sol";


import "hardhat/console.sol";

//This strategy does not return all the funds to simulate slippage
contract MockLoosingStrategy is IStrategy{

    address allocator;
    mapping(address => uint) depositedAmounts;
    uint returnRate;

    constructor(address _allocator, uint _returnRate){
        allocator = _allocator;
        returnRate = _returnRate;
    }

    function deploy(address _token) external override {
        depositedAmounts[_token] += IERC20(_token).balanceOf(address(this));
    }


    // Amount left in the contract may not be correct if reallocation occurs
    function withdraw(address _token, uint _amount) external override returns (uint) {
        int roi = int(balance(_token)) - int(depositedAmounts[_token]);
        if (int(_amount) > roi) {
            depositedAmounts[_token] = uint(int(depositedAmounts[_token])-(int(_amount) - roi));
        }
        IERC20 token = IERC20(_token);
        uint amount = ( _amount * 100 / returnRate);
        require(token.balanceOf(address(this))  >= amount, "insufficient fund");
        token.transfer(allocator, _amount);
        token.transfer(address(0), amount - _amount );
        return _amount;
    }

    function emergencyWithdraw(address _token) external override returns (uint) {
        uint amount = deposited(_token);
        IERC20(_token).transfer(allocator, amount);
        depositedAmounts[_token] = 0;
        return amount;
    }

    function collectProfits(address _token) external override returns (int){
        int profits = int(balance(_token)) - int(depositedAmounts[_token]);
        IERC20(_token).transfer(allocator, uint(profits));
        return profits;
    }

    function collectRewards(address _token) external override {}

    function deposited(address _token) public view override returns (uint) {
        return depositedAmounts[_token];
    }

    function balance(address _token) public view override returns (uint) {
        return IERC20(_token).balanceOf(address(this)) * returnRate / 100;
    }
}
