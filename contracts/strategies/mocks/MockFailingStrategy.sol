// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../IStrategy.sol";

contract MockFailingStrategy is IStrategy {
    mapping(address => uint256) depositedAmounts;

    function deploy(address _token) external override {
        require(false, "it always fail");
    }

    function withdrawTo(
        address _token,
        uint256 _amount,
        address _to
    ) external override returns (uint256) {
        require(false, "it always fail");
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
        require(false, "it always fail");
        return 0;
    }

    function collectRewards(address _token, address _to)
        external
        override
        returns (address[] memory)
    {
        require(false, "it always fail");
        return new address[](0);
    }

    function deposited(address _token) public view override returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }

    function balance(address _token) public view override returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }
}
