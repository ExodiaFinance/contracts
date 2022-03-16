// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../../mocks/MockERC20.sol";
import "../IStrategy.sol";
import "hardhat/console.sol";

contract MockCollectableProfitsStrategy is IStrategy {
    uint256 amount0;

    function deploy(address _token) external override {}

    function withdrawTo(
        address _token,
        uint256 _amount,
        address _to
    ) external override returns (uint256) {
        return 0;
    }

    function emergencyWithdrawTo(address _token, address _to)
        external
        override
        returns (uint256)
    {
        return 0;
    }

    function collectProfits(address _token, address _to)
        external
        override
        returns (int256)
    {
        MockToken(_token).mint(_to, amount0);
        return int256(amount0);
    }

    function collectRewards(address _token, address _to)
        external
        override
        returns (address[] memory)
    {
        address[] memory tokenRewards = new address[](0);
        return tokenRewards;
    }

    function deposited(address _token) public view override returns (uint256) {
        return 0;
    }

    function balance(address _token) public view override returns (uint256) {
        return 0;
    }

    function setProfits(uint256 _amount0) external {
        amount0 = _amount0;
    }
}
