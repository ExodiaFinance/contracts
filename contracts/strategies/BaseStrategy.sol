// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

import "../ExodiaAccessControlInitializable.sol";
import "./IStrategy.sol";
import "./IAssetAllocator.sol";

import "hardhat/console.sol";

interface DelegateRegistry {
    function setDelegate(bytes32 id, address delegate) external;
}

abstract contract BaseStrategy is IStrategy, ExodiaAccessControlInitializable, Pausable {
    address public allocator;

    function _initialize(address _allocator, address _roles) internal onlyInitializing {
        require(_allocator != address(0), "allocator cannot be null");
        allocator = _allocator;
        ExodiaAccessControlInitializable.initializeAccessControl(_roles);
    }

    function deploy(address _token) external override whenNotPaused {
        _deploy(_token);
    }

    function _deploy(address _token) internal virtual;

    function withdrawTo(
        address _token,
        uint256 _amount,
        address _to
    ) external override onlyAssetAllocator returns (uint256) {
        return _withdrawTo(_token, _amount, _to);
    }

    function _withdrawTo(
        address _token,
        uint256 _amount,
        address _to
    ) internal virtual returns (uint256);

    function emergencyWithdrawTo(address _token, address _to)
        external
        override
        onlyAssetAllocator
        returns (uint256)
    {
        return _emergencyWithdrawTo(_token, _to);
    }

    function _emergencyWithdrawTo(address _token, address _to)
        internal
        virtual
        returns (uint256);

    function collectProfits(address _token, address _to)
        external
        override
        onlyAssetAllocator
        returns (int256)
    {
        return _collectProfits(_token, _to);
    }

    function _collectProfits(address _token, address _to)
        internal
        virtual
        returns (int256);

    function collectRewards(address _token, address _to)
        external
        override
        onlyAssetAllocator
        returns (address[] memory)
    {
        return _collectRewards(_token, _to);
    }

    function _collectRewards(address _token, address _to)
        internal
        virtual
        returns (address[] memory);

    function exit(address _token) external onlyStrategist {
        _exit(_token);
    }

    function _exit(address _token) internal virtual;

    function extractToDAO(address _token) external onlyStrategist {
        IERC20 token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        token.transfer(roles.DAO_ADDRESS(), balance);
    }

    function setDelegate(
        address _registry,
        address _delegate,
        bytes32 _id
    ) external onlyArchitect {
        DelegateRegistry(_registry).setDelegate(_id, _delegate);
    }

    modifier onlyAssetAllocator() {
        require(msg.sender == allocator, "Strategy: caller is not allocator");
        _;
    }

    function pause() external onlyStrategist {
        _pause();
    }

    function unPause() external onlyStrategist {
        _unpause();
    }
}
