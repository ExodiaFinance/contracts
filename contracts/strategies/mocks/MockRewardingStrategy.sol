// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../../mocks/MockERC20.sol";
import "../IStrategy.sol";

import "hardhat/console.sol";

contract MockRewardingStrategy is IStrategy {
    address tok0;
    uint256 amount0;
    address tok1;
    uint256 amount1;

    constructor(address _reward0, address _reward1) {
        tok0 = _reward0;
        tok1 = _reward1;
    }

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
        return 0;
    }

    function collectRewards(address _token, address _to)
        external
        override
        returns (address[] memory)
    {
        MockToken(tok0).mint(_to, amount0);
        MockToken(tok1).mint(_to, amount1);
        address[] memory rewardTokens = new address[](2);
        rewardTokens[0] = tok0;
        rewardTokens[1] = tok1;
        return rewardTokens;
    }

    function deposited(address _token) public view override returns (uint256) {
        return 0;
    }

    function balance(address _token) public view override returns (uint256) {
        return 0;
    }

    function setRewards(uint256 _amount0, uint256 _amount1) external {
        amount0 = _amount0;
        amount1 = _amount1;
    }
}
