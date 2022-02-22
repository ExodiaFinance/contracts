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
    uint deployed;

    constructor(address _allocator, uint _returnRate){
        allocator = _allocator;
        returnRate = _returnRate;
    }

    function deploy(address _token) external override {
        IERC20(_token).transfer(address(0), deployed - balance(_token));
        uint internalBalance = IERC20(_token).balanceOf(address(this));
        if(internalBalance > deployed){
            depositedAmounts[_token] += internalBalance - deployed;
        }
        deployed = internalBalance;
    }

    // Amount left in the contract may not be correct if reallocation occurs
    function withdrawTo(address _token, uint _amount, address _to) external override returns (uint) {
        int roi = int(balance(_token)) - int(depositedAmounts[_token]);
        if (int(_amount) > roi) {
            depositedAmounts[_token] = uint(int(depositedAmounts[_token])-(int(_amount) - roi));
        }
        IERC20 token = IERC20(_token);
        token.transfer(address(0), token.balanceOf(address(this)) - balance(_token) );
        token.transfer(_to, _amount);
        deployed = token.balanceOf(address(this));
        return _amount;
    }

    function emergencyWithdrawTo(address _token, address _to) external override returns (uint) {
        uint amount = deposited(_token);
        IERC20(_token).transfer(_to, amount);
        depositedAmounts[_token] = 0;
        return amount;
    }

    function collectProfits(address _token, address _to) external override returns (int){
        int profits = int(balance(_token)) - int(depositedAmounts[_token]);
        IERC20(_token).transfer(_to, uint(profits));
        return profits;
    }

    function collectRewards(address _token, address _to) external override {}

    function deposited(address _token) public view override returns (uint) {
        return depositedAmounts[_token];
    }

    function balance(address _token) public view override returns (uint) {
        return deployed * returnRate / 100;
    }
}
