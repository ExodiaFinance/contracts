// SPDX-License-Identifier: MIT
pragma solidity ^0.7.5;
pragma abicoder v2;

import "../librairies/SafeMath.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IOlympusTreasury.sol";
import "../Policy.sol";
import "./IStrategy.sol";
import "./IAssetAllocator.sol";
import "./IAllocationCalculator.sol";
import "./IAllocatedRiskFreeValue.sol";

import "hardhat/console.sol";

contract AssetAllocator is Policy, IAssetAllocator {
    using SafeMath for uint256;
    
    address public immutable treasuryAddress;
    address public arfvAddress;
    address public allocationCalculator;
    mapping(address => uint) public allocatedTokens;
    mapping(address => uint) public lastRebalance;
    uint public minElapsedTime;
    
    constructor(address _treasury, address _allocationCalculator){
        treasuryAddress = _treasury;
        allocationCalculator = _allocationCalculator;
    }

    function setAllocationCalculator(address _calculator) external onlyPolicy {
        allocationCalculator = _calculator;
    }
    
    function setMinElapsedTimeRebalance(uint _minElapsedTime) external onlyPolicy {
        minElapsedTime = _minElapsedTime;
    }
    
    function _getAllocationCalculator() internal view returns (IAllocationCalculator){
        return IAllocationCalculator(allocationCalculator);
    }
    
    function collectProfits(address _token) external override {}
    
    function collectRewards(address _token) external override {}
    
    function forceRebalance(address _token) external onlyPolicy {
        _rebalance(_token);
    }
    
    function rebalance(address _token) external override {
        require(lastRebalance[_token] + minElapsedTime < block.timestamp, "Exceeding rebalance time treshold");
        _rebalance(_token);
    }
    
    function _rebalance(address _token) internal {
        uint treasuryBalance = _manage(_token);
        uint arfv = allocatedTokens[_token] + treasuryBalance;
        address[] memory strategies = _getStrategies(_token);
        (uint allocatedBalance, uint[] memory balances) = _balance(_token, strategies);
        uint manageable = allocatedBalance + treasuryBalance;
        (uint[] memory targetAllocations,) = _calculateAllocations(_token, manageable);
        (uint actuallyWithdrawn, uint expectedToWithdraw, uint allocated) = _withdrawTargetExcess(_token, balances, targetAllocations, strategies);
        (targetAllocations,) = _calculateAllocations(_token, manageable + actuallyWithdrawn - expectedToWithdraw);
        allocated += _allocateToTarget(_token, balances, targetAllocations, strategies);
        allocatedTokens[_token] = allocated;
        _sendToTreasury(_token);
        _burnARFV(_token, arfv, allocated);
        lastRebalance[_token] = block.timestamp;
    }
    
    function _withdrawTargetExcess(
        address _token, 
        uint[] memory _balances, 
        uint[] memory _targetAllocations, 
        address[] memory _strategies
    ) internal returns (uint, uint, uint){
        uint allocated = 0;
        uint expectedToWithdraw = 0;
        uint actuallyWithdrawn = 0;
        for(uint i = 0; i < _strategies.length; i++){
            if(_balances[i] > _targetAllocations[i]){
                uint amount = _balances[i] - _targetAllocations[i];
                allocated += _balances[i] - amount;
                expectedToWithdraw += amount;
                actuallyWithdrawn += IStrategy(_strategies[i]).withdraw(_token, amount);
            }
        }
        return (actuallyWithdrawn, expectedToWithdraw, allocated);
    }
    
    function _allocateToTarget(
        address _token,
        uint[] memory _balances,
        uint[] memory _targetAllocations,
        address[] memory _strategies
    ) internal returns (uint){
        uint allocated = 0;
        for(uint i = 0; i < _strategies.length; i++){
            if(_balances[i] < _targetAllocations[i]){
                uint amount = _targetAllocations[i] - _balances[i];
                allocated += _balances[i] + amount;
                address strategyAddress = _strategies[i];
                IERC20(_token).transfer(strategyAddress, amount);
                IStrategy(strategyAddress).deploy(_token);
            }
        }
        return allocated;
    }
    
    function _getStrategies(address _token) internal view returns(address[] memory){
        return IAllocationCalculator(allocationCalculator).getStrategies(_token);
    }
    
    function _calculateAllocations(address _token, uint _manageable) internal view returns (uint[] memory, uint){
        return _getAllocationCalculator().calculateAllocation(_token, _manageable);
    }
    
    function allocate(address _token) external {
        uint balance = _manage(_token);
        uint manageable = allocatedTokens[_token] + balance;
        address[] memory strategies = _getStrategies(_token);
        (, uint[] memory balances) = _deposits(_token, strategies);
        (uint[] memory allocations, uint allocated) = _calculateAllocations(_token, manageable);
        _allocateToTarget(_token, balances, allocations, strategies);
        allocatedTokens[_token] = allocated;
        _sendToTreasury(_token);
        _burnARFV(_token, manageable, allocated);
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
    
    /**
        @notice withdraws ARFV token
        */
    function _burnARFV(
        address _token, 
        uint _manageable,
        uint _allocated
    ) internal {
        IOlympusTreasury treasury = _getTreasury();
        IAllocatedRiskFreeValue arfv = _getARFVToken();
        if(_manageable > _allocated){
            uint returnedAmount = _manageable.sub(_allocated);
            uint returnedRFV = treasury.valueOf(_token, returnedAmount);
            treasury.manage(arfvAddress, returnedRFV);
            arfv.burn(returnedRFV);   
        } else if (_manageable < _allocated){
            uint profits = _allocated.sub(_manageable);
            uint profitsRFV = treasury.valueOf(_token, profits);
            arfv.mint(profitsRFV);
            arfv.transfer(treasuryAddress, profitsRFV);
        }
    }

    function _sendToTreasury(address _token) internal {
        uint balance = IERC20(_token).balanceOf(address(this));
        _sendToTreasury(_token, balance);
    }

    function sendToTreasury(address _token, uint _amount) external override {
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        allocatedTokens[_token] -= _amount;
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
        allocatedTokens[_token] -= _amountToAllocation(_strategy, _token, _amount);
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
            allocatedTokens[token] -= IStrategy(_strategy).deposited(token);
            IStrategy(_strategy).emergencyWithdraw(token);
            _sendToTreasury(token);
        }
    }

    function allocatedBalance(address _token) external view override returns (uint) {
        (uint allocated,) = _balance(_token, IAllocationCalculator(allocationCalculator).getStrategies(_token));
        return allocated;
    }
    
    function _balance(address _token, address[] memory _strategies) internal view returns (uint, uint[] memory){
        uint allocated = 0;
        uint[] memory balances = new uint[](_strategies.length);
        for(uint i = 0; i < _strategies.length; i++){
            uint balance = IStrategy(_strategies[i]).balance(_token);
            balances[i] = balance;
            allocated += balance;
        }
        return (allocated, balances);
    }    
    
    function _deposits(address _token, address[] memory _strategies) internal view returns (uint, uint[] memory){
        uint allocated = 0;
        uint[] memory balances = new uint[](_strategies.length);
        for(uint i = 0; i < _strategies.length; i++){
            uint balance = IStrategy(_strategies[i]).deposited(_token);
            balances[i] = balance;
            allocated += balance;
        }
        return (allocated, balances);
    }
    
}
