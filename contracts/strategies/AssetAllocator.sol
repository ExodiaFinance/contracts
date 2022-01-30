// SPDX-License-Identifier: MIT
pragma solidity ^0.7.5;
pragma abicoder v2;

import "../librairies/SafeMath.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IOlympusTreasury.sol";
import "../Policy.sol";
import "./IStrategy.sol";
import "./IAssetAllocator.sol";
import "./IAllocatedRiskFreeValue.sol";

import "hardhat/console.sol";

contract AssetAllocator is Policy, IAssetAllocator {
    using SafeMath for uint256;
    
    address public immutable treasuryAddress;
    mapping(address => Allocations) tokenAllocations;
    address public arfvAddress;
    
    constructor(address _treasury){
        treasuryAddress = _treasury;
    }

    function getAllocation(address _token) external view override returns (Allocations memory) {
        return tokenAllocations[_token];
    }
    
    function setAllocation(
        address _token, 
        address[] calldata _strategies, 
        uint[] calldata _allocations) 
    external override onlyPolicy {
        Allocations storage allocations = tokenAllocations[_token];
        allocations.strategies = _strategies;
        allocations.allocations = _allocations;
    }

    function collectProfits(address _token) external override {}
    function collectRewards(address _token) external override {}
    
    function rebalance(address _token) external override {
        Allocations storage stratAllocations = tokenAllocations[_token];
        uint balance = _manage(_token);
        uint arfv = stratAllocations.allocated + balance;
        uint manageable = _balance(_token) + balance;
        (uint[] memory allocations, uint total) = _calculateAllocations(_token, stratAllocations.allocations, manageable);
        uint[] memory toWithdraw = new uint[](stratAllocations.strategies.length);
        for(uint i = 0; i < stratAllocations.strategies.length; i++){
            uint balance = IStrategy(stratAllocations.strategies[i]).balance(_token);
            if(balance > allocations[i]){
                toWithdraw[i] = balance - allocations[i];
            }
        }
        (uint actual, uint expected) = _withdrawAmounts(_token, stratAllocations.strategies, toWithdraw);
        uint manageableAfterWithdraw = manageable;
        if(actual > expected){ //We made a profit so we have more money manageable
            manageableAfterWithdraw += actual - expected;
        } else if (actual < expected){ // We lost money
            manageableAfterWithdraw -= expected - actual;
        }
        (allocations, total) = _calculateAllocations(_token, stratAllocations.allocations, manageableAfterWithdraw);
        _allocate(_token, stratAllocations.strategies, allocations);
        stratAllocations.allocated = total;
        _sendToTreasury(_token);
        _manageARFV(_token, arfv, stratAllocations.allocated);
        
    }
    
    function allocate(address _token) external {
        Allocations storage stratAllocations = tokenAllocations[_token];
        uint balance = _manage(_token);
        uint manageable = stratAllocations.allocated + balance;
        (uint[] memory allocations, uint allocated) = _calculateAllocations(_token, stratAllocations.allocations, manageable);
        _allocate(_token, stratAllocations.strategies, allocations);
        stratAllocations.allocated = allocated;
        _sendToTreasury(_token);
        _manageARFV(_token, manageable, stratAllocations.allocated);
    }
    
    function _manage(address _token) internal returns(uint){
        IOlympusTreasury treasury = _getTreasury();
        IAllocatedRiskFreeValue arfv = _getARFVToken();
        uint balance = IERC20(_token).balanceOf(treasuryAddress);
        uint valueOfBal = treasury.valueOf(_token, balance);
        if(valueOfBal > 0) {
            arfv.mint(valueOfBal);
            arfv.approve(treasuryAddress, valueOfBal);
            treasury.deposit(valueOfBal, arfvAddress, valueOfBal);   
        }
        treasury.manage(_token, balance);
        return balance;
    }
    
    function _calculateAllocations(
        address _token, 
        uint[] memory _allocations, 
        uint _manageable
    ) internal view returns(uint[] memory, uint){
        uint[] memory allocations = new uint[](_allocations.length);
        uint allocated = 0;
        for(uint i = 0; i < _allocations.length; i++){
            uint allocation = _allocations[i].mul(_manageable).div(1e5);
            allocations[i] = allocation;
            allocated += allocation;
        }
        return (allocations, allocated);
    }
    
    function _withdrawAmounts(
        address _token, 
        address[] memory _strategies, 
        uint[] memory _amounts) internal returns (uint, uint) {
        uint expected = 0;
        uint actual = 0;
        for (uint i = 0; i < _strategies.length; i++){
            uint amount = _amounts[i];
            if(amount > 0){
                expected += amount;
                actual += IStrategy(_strategies[i]).withdraw(_token, amount);
            }
        }
        return (actual, expected);
    }

    function _allocate(address _token, address[] memory _strategies, uint[] memory _allocations) internal {
        for (uint i = 0; i < _strategies.length; i++){
            address strategyAddress = _strategies[i];
            IStrategy strategy = IStrategy(strategyAddress);
            uint allocation = _allocations[i];
            uint deposited = strategy.deposited(_token);
            if (allocation > deposited){
                uint amount = allocation - deposited;
                IERC20(_token).transfer(strategyAddress, amount);
                strategy.deploy(_token);
            }
        }
    }
    /**
        @notice withdraws ARFV token
        */
    function _manageARFV(
        address _token, 
        uint _manageable,
        uint _allocated
    ) internal {
        IOlympusTreasury treasury = _getTreasury();
        IAllocatedRiskFreeValue arfv = _getARFVToken();
        IERC20 token = IERC20(_token);
        uint returnedAmount = _manageable.sub(_allocated);
        uint returnedRFV = treasury.valueOf(_token, returnedAmount);
        treasury.manage(arfvAddress, returnedRFV);
        arfv.burn(returnedRFV);
    }

    function _sendToTreasury(address _token) internal {
        uint balance = IERC20(_token).balanceOf(address(this));
        _sendToTreasury(_token, balance);
    }

    function sendToTreasury(address _token, uint _amount) external override {
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        tokenAllocations[_token].allocated -= _amount;
        _sendToTreasury(_token, _amount);
    }

    function _sendToTreasury(address _token, uint _amount) internal {
        if(_hasRiskFreeValue(_token)){
            IOlympusTreasury treasury = _getTreasury();
            IERC20(_token).approve(treasuryAddress, _amount);
            treasury.deposit(_amount, _token, treasury.valueOf(_token, _amount));
        } else {
            IERC20(_token).transfer(treasuryAddress, _amount);
        }
    }
    
    function getTreasury() external view returns (address){
        return treasuryAddress;
    }
    
    function _getTreasury() internal view returns(IOlympusTreasury){
        return IOlympusTreasury(treasuryAddress);
    }
    
    function _getARFVToken() internal view returns (IAllocatedRiskFreeValue){
        return IAllocatedRiskFreeValue(arfvAddress);
    }

    function setARFVToken(address _token) external onlyPolicy{
        arfvAddress = _token;
    }

    function hasRiskFreeValue(address _token) external view returns(bool) {
        return _hasRiskFreeValue(_token);
    }
    
    function _hasRiskFreeValue(address _token) internal view returns (bool){
        IOlympusTreasury treasury = _getTreasury();
        return treasury.isReserveToken(_token) || treasury.isLiquidityToken(_token);
    }
    
    function withdrawFromStrategy(
        address _token, 
        address _strategy,
        uint _amount
    ) external override onlyPolicy {
        _withdrawFromStrategy(_token, _strategy, _amount);
        _sendToTreasury(_token, _amount);
    }

    function _withdrawFromStrategy(address _token, address _strategy, uint _amount) internal {
        tokenAllocations[_token].allocated -= _amountToAllocation(_strategy, _token, _amount);
        uint amount = IStrategy(_strategy).withdraw(_token, _amount);
    }
    
    function _amountToAllocation(address _strategy, address _token, uint _amount) internal returns (uint) {
        IStrategy strategy = IStrategy(_strategy);
        return strategy.balance(_token).mul(_amount).div(strategy.deposited(_token));
    }
    
    function emergencyWithdrawFromStrategy(
        address[] calldata _tokens, 
        address _strategy
    ) external override onlyPolicy {
        for(uint i = 0; i < _tokens.length; i++){
            address token = _tokens[i];
            tokenAllocations[token].allocated -= IStrategy(_strategy).deposited(token);
            IStrategy(_strategy).emergencyWithdraw(token);
            _sendToTreasury(token);
        }
    }

    function allocatedBalance(address _token) external view override returns (uint) {
        return _balance(_token);
    }
    
    function _balance(address _token) internal view returns (uint){
        uint allocated = 0;
        Allocations memory allocations = tokenAllocations[_token];
        for(uint i = 0; i < allocations.strategies.length; i++){
            allocated += IStrategy(allocations.strategies[i]).balance(_token);
        }
        return allocated;
    }
    
}
