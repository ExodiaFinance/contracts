// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../IStrategy.sol";
import "../../mocks/MockERC20.sol";

contract MockWinningStrategy is IStrategy{

    address allocator;
    mapping(address => uint) depositedAmounts;
    uint returnRate;
    MockToken dai;

    constructor(address _allocator, address _dai, uint _returnRate){
        allocator = _allocator;
        dai = MockToken(_dai);
        returnRate = _returnRate;
    }

    function deploy(address _token) external override {
        _mintProfits(_token);
        depositedAmounts[_token] = IERC20(_token).balanceOf(address(this));
    }

    function withdrawTo(address _token, uint _amount, address _to) external override returns (uint) {
        int roi = int(balance(_token)) - int(depositedAmounts[_token]);
        if (int(_amount) > roi) {
            depositedAmounts[_token] = uint(int(depositedAmounts[_token])-(int(_amount) - roi));
        }
        _mintProfits(_token);
        IERC20(_token).transfer(_to, _amount);
        depositedAmounts[_token] = IERC20(_token).balanceOf(address(this));
        return _amount;
    }

    function emergencyWithdrawTo(address _token, address _to) external override returns (uint) {
        uint amount = IERC20(_token).balanceOf(address(this));
        _mintProfits(_token);
        IERC20(_token).transfer(_to, amount);
        depositedAmounts[_token] = 0;
        return amount;
    }

    function collectProfits(address _token, address _to) external override returns (int){
        uint profits = _mintProfits(_token);
        IERC20(_token).transfer(_to, uint(profits));
        return int(profits);
    }
    
    function _mintProfits(address _token) internal returns (uint) {
        uint profits = depositedAmounts[_token] * (returnRate-100) / 100;
        dai.mint(address(this), profits);
        return profits;
    }

    function collectRewards(address _token, address _to) external override {}

    function deposited(address _token) public view override returns (uint) {
        return depositedAmounts[_token];
    }

    function balance(address _token) public view override returns (uint) {
        return depositedAmounts[_token] * returnRate / 100;
    }
}
