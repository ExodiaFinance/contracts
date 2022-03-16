// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../IStrategy.sol";

contract MockStrategy is IStrategy {
    mapping(address => uint256) depositedAmounts;

    function deploy(address _token) external override {
        depositedAmounts[_token] += IERC20(_token).balanceOf(address(this));
    }

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
        IERC20(_token).transfer(_to, _amount);
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
        return IERC20(_token).balanceOf(address(this));
    }
}
