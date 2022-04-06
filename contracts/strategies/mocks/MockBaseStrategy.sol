// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

import "../IAssetAllocator.sol";
import "../BaseStrategy.sol";

contract MockBaseStrategy is BaseStrategy {
    mapping(address => uint256) public deposited;

    function initialize(address _allocator, address _roles) external initializer {
        _initialize(_allocator, _roles);
    }

    function _deploy(address _token) internal override {}

    function _withdrawTo(
        address _token,
        uint256 _amount,
        address _to
    ) internal override returns (uint256) {
        return 0;
    }

    function _emergencyWithdrawTo(address _token, address _to)
        internal
        override
        returns (uint256)
    {
        return 0;
    }

    function _collectProfits(address _token, address _to)
        internal
        override
        returns (int256)
    {
        return 0;
    }

    function _collectRewards(address _token, address _to)
        internal
        override
        returns (address[] memory)
    {
        return new address[](0);
    }

    function _exit(address _token) internal override {}

    function balance(address _token) external view override returns (uint256) {
        return 0;
    }
}
