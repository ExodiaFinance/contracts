// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../IAssetAllocator.sol";
import "../BaseStrategy.sol";

interface IReaperVault is IERC20 {
    function deposit(uint256 _amount) external;
    
    function depositAll() external;

    function withdraw(uint256 _maxshares) external;

    function withdrawAll() external;

    function getPricePerFullShare() external view returns (uint256);

    function decimals() external view returns (uint8);
    
    function token() external view returns (address);
}

contract ReaperVaultStrategy is BaseStrategy{

    mapping(address => address) public tokenVault;
    mapping(address => uint256) public override deposited;

    function initialize(address _allocator, address _roles) public initializer {
        _initialize(_allocator, _roles);
    }

    function addVault(address _vault) external onlyStrategist {
        tokenVault[IReaperVault(_vault).token()] = _vault;
    }

    function _deploy(address _token) internal override {
        address vault = tokenVault[_token];
        IERC20 token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        token.approve(vault, balance);
        IReaperVault(vault).deposit(balance);
        deposited[_token] += balance;
    }

    function _withdrawTo(
        address _token,
        uint256 _amount,
        address _to
    ) internal override returns (uint256) {
        address vault = tokenVault[_token];
        uint256 amountOfShares = _amountToShares(vault, _amount);
        deposited[_token] -= _amountToDeposits(_token, _amount);
        IReaperVault(vault).withdraw(amountOfShares);
        uint256 withdrawnAmount = IERC20(_token).balanceOf(address(this));
        IERC20(_token).transfer(_to, _amount);
        return withdrawnAmount;
    }

    function _amountToShares(address _vault, uint256 _amount) internal returns (uint256) {
        IReaperVault vault = IReaperVault(_vault);
        return _amount * 10**vault.decimals() / vault.getPricePerFullShare();
    }
    
    function _amountToDeposits(address _token, uint256 _amount) internal returns(uint256) {
        return _amount * 10**IERC20Metadata(_token).decimals() / balance(_token);
    }

    function _emergencyWithdrawTo(address _token, address _to)
    internal
    override
    returns (uint256)
    {
        IReaperVault(tokenVault[_token]).withdrawAll();
        uint256 withdrawnAmount = IERC20(_token).balanceOf(address(this));
        _sendTo(_token, _to);
        deposited[_token] = 0;
        return withdrawnAmount;
    }

    function _collectProfits(address _token, address _to) internal override returns (int256)
    {
        uint256 balance = balance(_token);
        uint256 deposit = deposited[_token];
        if (balance > deposit) {
            return int256(_withdrawTo(_token, balance - deposit, _to));
        }
        return int256(balance) - int256(deposit);
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
        address vaultAddress = tokenVault[_token];
        IReaperVault vault = IReaperVault(vaultAddress);
        uint256 vaultBPS = 10**vault.decimals();
        uint deployed = vault.balanceOf(address(this)) * vault.getPricePerFullShare() / vaultBPS;
        return deployed + IERC20(_token).balanceOf(address(this));
    }

    function _exit(address _token) internal override {
        deposited[_token] = 0;
        IReaperVault(tokenVault[_token]).withdrawAll();
    }
    
    function _sendTo(address _token, address _to) internal {
        IERC20 token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        token.transfer(_to, balance);
    }
    
}
