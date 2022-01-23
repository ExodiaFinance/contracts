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
        return _getAllocation(_token);
    }    
    
    function _getAllocation(address _token) internal view returns (Allocations memory) {
        return tokenAllocations[_token];
    }
    
    function setAllocation(
        address _token, 
        address[] calldata _strategies, 
        uint[] calldata _allocations) 
    external override onlyPolicy {
        Allocations memory allocations = _getAllocation(_token);
        allocations.strategies = _strategies;
        allocations.allocations = _allocations;
        tokenAllocations[_token] = allocations;
    }
    
    function setARFVToken(address _token) external onlyPolicy{
        arfvAddress = _token;
    }
    
    function reallocate(address _token) external override {
        Allocations memory allocations = _getAllocation(_token);
        uint balance = _manage(_token);
        uint manageable = allocations.allocated + balance;
        (int[] memory reAllocations, uint allocated) = _calculateAllocations(_token, allocations, manageable);
        _withdrawAllocations(_token, allocations.strategies, reAllocations);
        _allocate(_token, allocations.strategies, reAllocations);
        tokenAllocations[_token].allocated = allocated;
        _returnToTreasury(_token);
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
    
    function _calculateAllocations(address _token, Allocations memory _allocations, uint _manageable) internal view returns(int[] memory, uint){
        int[] memory allocations = new int[](_allocations.strategies.length);
        uint allocated = _allocations.allocated;
        for(uint i = 0; i < _allocations.strategies.length; i++){
            address strategy = _allocations.strategies[i];
            uint allocation = _allocations.allocations[i].mul(_manageable).div(1e5);
            uint deposited = IStrategy(strategy).deposited(_token);
            int deltaAllocation = int(allocation) - int(deposited);
            allocations[i] = deltaAllocation;
            allocated = uint(int(allocated) + deltaAllocation);
        }
        return (allocations, allocated);
    }
    
    function _withdrawAllocations(address _token, address[] memory _strategies, int[] memory _allocations) internal {
        for (uint i = 0; i < _strategies.length; i++){
            if (_allocations[i] < 0){
                IStrategy(_strategies[i]).withdraw(_token, uint(_allocations[i]*-1));
            }
        }
    }

    function _allocate(address _token, address[] memory _strategies, int[] memory _allocations) internal {
        for (uint i = 0; i < _strategies.length; i++){
            if (_allocations[i] > 0){
                address strategy = _strategies[i];
                IERC20(_token).transfer(strategy, uint(_allocations[i]));
                IStrategy(strategy).deploy(_token);
            }
        }
    }
    
    function _returnToTreasury(address _token) internal {
        IOlympusTreasury treasury = _getTreasury();
        IAllocatedRiskFreeValue arfv = _getARFVToken();
        uint balance = IERC20(_token).balanceOf(address(this));
        _sendToTreasury(_token, balance);
        if(_hasRiskFreeValue(_token)){
            uint returnedRFV = treasury.valueOf(_token, balance);
            uint arfvBalance = arfv.balanceOf(treasuryAddress);
            if(arfvBalance > returnedRFV){
                treasury.manage(arfvAddress, returnedRFV);
                arfv.burn(returnedRFV);   
            } else {
                treasury.manage(arfvAddress, arfvBalance);
                arfv.burn(arfvBalance);
            }
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
    
    function _sendToTreasury(address _token) internal {
        IERC20 token = IERC20(_token);
        uint balance = token.balanceOf(address(this));
        _sendToTreasury(_token, balance);
    }

    function sendToTreasury(address _token, uint _amount) external override {
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
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
    
    function hasRiskFreeValue(address _token) external view returns(bool) {
        return _hasRiskFreeValue(_token);
    }
    
    function _hasRiskFreeValue(address _token) internal view returns (bool){
        IOlympusTreasury treasury = _getTreasury();
        return treasury.isReserveToken(_token) || treasury.isLiquidityToken(_token);
    }
    
}
