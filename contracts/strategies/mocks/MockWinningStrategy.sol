// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../IStrategy.sol";
import "../../mocks/MockERC20.sol";
import "hardhat/console.sol";

contract MockWinningStrategy is IStrategy {
    address allocator;
    mapping(address => uint256) depositedAmounts;
    uint256 returnRate;
    MockToken dai;

    constructor(
        address _allocator,
        address _dai,
        uint256 _returnRate
    ) {
        allocator = _allocator;
        dai = MockToken(_dai);
        returnRate = _returnRate;
    }

    function deploy(address _token) external override {
        _mintProfits(_token);
        depositedAmounts[_token] = IERC20(_token).balanceOf(address(this));
    }

    function withdrawTo(
        address _token,
        uint256 _amount,
        address _to
    ) external override returns (uint256) {
        _mintProfits(_token);
        IERC20(_token).transfer(_to, _amount);
        depositedAmounts[_token] = IERC20(_token).balanceOf(address(this));
        return _amount;
    }

    function emergencyWithdrawTo(address _token, address _to)
        external
        override
        returns (uint256)
    {
        uint256 amount = IERC20(_token).balanceOf(address(this));
        _mintProfits(_token);
        IERC20(_token).transfer(_to, amount);
        depositedAmounts[_token] = 0;
        return amount;
    }

    function collectProfits(address _token, address _to)
        external
        override
        returns (int256)
    {
        uint256 profits = _mintProfits(_token);
        IERC20(_token).transfer(_to, uint256(profits));
        return int256(profits);
    }

    function _mintProfits(address _token) internal returns (uint256) {
        uint256 profits = (depositedAmounts[_token] * (returnRate - 100)) / 100;
        dai.mint(address(this), profits);
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
        return (depositedAmounts[_token] * returnRate) / 100;
    }
}
