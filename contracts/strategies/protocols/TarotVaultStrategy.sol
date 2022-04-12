// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../IAssetAllocator.sol";
import "../BaseStrategy.sol";
import "../../interfaces/tarot/ISupplyVault.sol";

contract TarotVaultStrategy is BaseStrategy {
    mapping(address => address) public tokenVault;
    mapping(address => uint256) public override deposited;

    function initialize(address _allocator, address _roles) public initializer {
        _initialize(_allocator, _roles);
    }

    function addVault(address _vault) external onlyStrategist {
        tokenVault[address(ISupplyVault(_vault).underlying())] = _vault;
    }

    function _deploy(address _token) internal override {
        address vault = tokenVault[_token];
        IERC20 token = IERC20(_token);
        uint256 depositAmount = token.balanceOf(address(this));
        token.approve(vault, depositAmount);
        ISupplyVault(vault).enter(depositAmount);
        deposited[_token] += depositAmount;
    }

    function _withdrawTo(
        address _token,
        uint256 _amount,
        address _to
    ) internal override returns (uint256) {
        address vault = tokenVault[_token];
        uint256 amountOfShares = _amountToShares(vault, _amount);
        deposited[_token] -= _amountToDeposits(_token, _amount);
        ISupplyVault(vault).leave(amountOfShares);
        uint256 withdrawnAmount = IERC20(_token).balanceOf(address(this));
        IERC20(_token).transfer(_to, _amount);
        return withdrawnAmount;
    }

    function _amountToShares(address _vault, uint256 _amount) internal returns (uint256) {
        return ISupplyVault(_vault).underlyingValuedAsShare(_amount);
    }

    function _amountToDeposits(address _token, uint256 _amount)
        internal
        returns (uint256)
    {
        return (_amount * 10**IERC20Metadata(_token).decimals()) / balance(_token);
    }

    function _emergencyWithdrawTo(address _token, address _to)
        internal
        override
        returns (uint256)
    {
        ISupplyVault(tokenVault[_token]).leave(
            IERC20(tokenVault[_token]).balanceOf(address(this))
        );
        uint256 withdrawnAmount = IERC20(_token).balanceOf(address(this));
        _sendTo(_token, _to);
        deposited[_token] = 0;
        return withdrawnAmount;
    }

    function _collectProfits(address _token, address _to)
        internal
        override
        returns (int256)
    {
        uint256 currentBalance = balance(_token);
        uint256 deposit = deposited[_token];
        if (currentBalance > deposit) {
            return int256(_withdrawTo(_token, currentBalance - deposit, _to));
        }
        return int256(currentBalance) - int256(deposit);
    }

    function _collectRewards(address _token, address _to)
        internal
        override
        returns (address[] memory)
    {
        // This farm compounds rewards into the base token
        return new address[](0);
    }

    function balance(address _token) public view override returns (uint256) {
        return
            ISupplyVault(tokenVault[_token]).underlyingBalanceForAccount(address(this)) +
            IERC20(_token).balanceOf(address(this));
    }

    function _exit(address _token) internal override {
        deposited[_token] = 0;
        ISupplyVault(tokenVault[_token]).leave(
            IERC20(tokenVault[_token]).balanceOf(address(this))
        );
    }

    function _sendTo(address _token, address _to) internal {
        IERC20 token = IERC20(_token);
        token.transfer(_to, token.balanceOf(address(this)));
    }
}
