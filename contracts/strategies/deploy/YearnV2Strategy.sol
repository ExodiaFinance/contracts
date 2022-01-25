// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "../../Policy.sol";
import "../IStrategy.sol";
import "../IAssetAllocator.sol";

import "hardhat/console.sol";

interface IVault is IERC20 {
    function deposit(uint _amount) external;
    function withdraw(uint _maxshares) external returns (uint);
    function withdraw() external returns (uint);
    function pricePerShare() external view returns (uint);
    function decimals() external view returns (uint8);
}

contract YearnV2Strategy is IStrategy, Policy {

    using SafeMath for uint;
    
    mapping(address => address) tokenVault;
    mapping(address => uint) public override deposited;
    address allocator;
    
    constructor(address _allocator){
        allocator = _allocator;
    }

    function getVault(address _token) external view returns (address) {
        return _getVault(_token);
    }

    function _getVault(address _token) internal view returns(address){
        return tokenVault[_token];
    }

    function setVault(address _token, address _vault) external onlyPolicy {
        tokenVault[_token] = _vault;
    }

    function deploy(address _token) external override {
        address vault = _getVault(_token);
        IERC20 token = IERC20(_token);
        uint balance = token.balanceOf(address(this));
        token.approve(vault, balance);
        IVault(vault).deposit(balance);
        deposited[_token] += balance;
    }

    function withdraw(address _token, uint _amount) external override onlyAssetAllocator returns(uint){
        return _withdraw(_token, _amount);
    }

    function _withdraw(address _token, uint _amount) internal returns (uint){
        address vault = _getVault(_token);
        uint amountOfShares = _amountToShares(_token, _amount);
        uint withdrawnAmount = IVault(vault).withdraw(amountOfShares);
        IERC20(_token).transfer(allocator, _amount);
        deposited[_token] -= _amount;
        return withdrawnAmount;
    }
    
    function emergencyWithdraw(address _token) external override returns (uint){
        uint withdrawnAmount = IVault(_getVault(_token)).withdraw();
        _sendToTreasury(_token);
        deposited[_token] = 0;
        return withdrawnAmount;
    }

    function collectProfits(address _token) external override returns (int){
        uint balance = balance(_token);
        uint deposit = deposited[_token];
        if (balance > deposit){
            return int(_withdraw(_token, balance - deposit));
        }
        return int(balance) - int(deposit);
    }

    function collectRewards(address _token) external override {
        // This farm compounds rewards into the base token
    }

    function balance(address _token) public view override returns(uint256){
        address vaultAddress = _getVault(_token);
        IVault vault = IVault(vaultAddress);
        uint256 vaultBPS = 10 ** vault.decimals();
        return vault.balanceOf(address(this)).mul(vault.pricePerShare()).div(vaultBPS);
    }
    
    function _amountToShares(address _vault, uint _amount) internal returns(uint) {
        IVault vault = IVault(_vault);
        return _amount
            .mul(10 ** vault.decimals())
            .div(vault.pricePerShare());
    }
    
    function sendToTreasury(address _token) external onlyPolicy {
        _sendToTreasury(_token);
    }

    function _sendToTreasury(address _token) internal {
        IERC20 token = IERC20(_token);
        uint balance = token.balanceOf(address(this));
        token.approve(allocator, balance);
        IAssetAllocator(allocator).sendToTreasury(_token, balance);
    }

    modifier onlyAssetAllocator() {
        require(msg.sender == allocator, "MCS: caller is not allocator");
        _;
    }

}
