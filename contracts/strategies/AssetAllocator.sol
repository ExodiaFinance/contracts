// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "../interfaces/IOlympusTreasury.sol";
import "../ExodiaAccessControl.sol";
import "./IStrategy.sol";
import "./IAssetAllocator.sol";
import "./IAllocationCalculator.sol";
import "./IAllocatedRiskFreeValue.sol";
import "./TreasuryDepositor.sol";
import "hardhat/console.sol";

contract AssetAllocator is ExodiaAccessControl, IAssetAllocator {
    using SafeMath for uint256;
    
    address public treasuryDepositorAddress;
    address public allocationCalculator;
    
    function initialize(
        address _treasuryDepositor,
        address _allocationCalculator, 
        address _roles
    ) public initializer {
        treasuryDepositorAddress = _treasuryDepositor;
        allocationCalculator = _allocationCalculator;
        __ExodiaAccessControl__init(_roles);
    }

    function setAllocationCalculator(address _calculator) external onlyArchitect {
        allocationCalculator = _calculator;
    }
    
    
    function _getAllocationCalculator() internal view returns (IAllocationCalculator){
        return IAllocationCalculator(allocationCalculator);
    }
    
    function collectProfits(address _token) external override {}
    
    function collectRewards(address _token) external override {}
    
    function rebalance(address _token, uint _amount) external override onlyMachine returns (uint) {
        address[] memory strategies = _getStrategies(_token);
        (uint allocatedBalance, uint[] memory balances) = _balance(_token, strategies);
        (uint[] memory targetAllocations,) = _calculateAllocations(_token, _amount);
        (uint available, uint expected, uint allocated) = _withdrawTargetExcess(_token, balances, targetAllocations, strategies);
        if(_amount > allocatedBalance){
            available = _amount - allocatedBalance + available;
            expected = _amount - allocatedBalance + expected;
        }
        allocated += _allocateToTarget(_token, balances, targetAllocations, strategies, available, expected);
        return allocated;
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
                actuallyWithdrawn += IStrategy(_strategies[i]).withdrawTo(_token, amount, msg.sender);
            }
        }
        return (actuallyWithdrawn, expectedToWithdraw, allocated);
    }
    
    function _allocateToTarget(
        address _token,
        uint[] memory _balances,
        uint[] memory _targetAllocations,
        address[] memory _strategies,
        uint _actual,
        uint _expected
    ) internal returns (uint){
        uint allocated = 0;
        for(uint i = 0; i < _strategies.length; i++){
            if(_balances[i] < _targetAllocations[i]){
                uint amount = _targetAllocations[i] - _balances[i];
                if(_actual != _expected){
                    // Adjust amount for slippage
                    amount = _actual * amount / _expected;
                }
                allocated += _balances[i] + amount;
                address strategyAddress = _strategies[i];
                IERC20(_token).transferFrom(msg.sender, strategyAddress, amount);
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
    
    function allocate(address _token, uint _amount) external {
        address[] memory strategies = _getStrategies(_token);
        (, uint[] memory balances) = _deposits(_token, strategies);
        (uint[] memory allocations, uint allocated) = _calculateAllocations(_token, _amount);
        _allocateToTarget(_token, balances, allocations, strategies,0,0);
    }
    
    function _getTreasuryDepositor() internal view returns (TreasuryDepositor){
        return TreasuryDepositor(treasuryDepositorAddress);
    }
    
    function withdrawFromStrategy(
        address _token, 
        address _strategy,
        uint _amount
    ) external override onlyStrategist {
        _withdrawFromStrategy(_token, _strategy, _amount);
        _getTreasuryDepositor().deposit(_token, _amount);
    }

    function _withdrawFromStrategy(address _token, address _strategy, uint _amount) internal {
        uint amount = IStrategy(_strategy).withdrawTo(_token, _amount, msg.sender);
    }
    
    function _amountToAllocation(address _strategy, address _token, uint _amount) internal returns (uint) {
        IStrategy strategy = IStrategy(_strategy);
        return strategy.balance(_token).mul(_amount).div(strategy.deposited(_token));
    }

    function sendToTreasury(address _token, uint _amount) external {
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        IERC20(_token).approve(treasuryDepositorAddress, _amount);
        _getTreasuryDepositor().deposit(_token, _amount);
    }
    
    function emergencyWithdrawFromStrategy(
        address[] calldata _tokens, 
        address _strategy
    ) external override onlyStrategist {
        for(uint i = 0; i < _tokens.length; i++){
            address token = _tokens[i];
            IStrategy(_strategy).emergencyWithdrawTo(token, msg.sender);
            uint balance = IERC20(token).balanceOf(address(this));
            _getTreasuryDepositor().deposit(token, balance);
        }
    }

    function allocatedBalance(address _token) external view override returns (uint) {
        (uint balance,) = _balance(_token, IAllocationCalculator(allocationCalculator).getStrategies(_token));
        return balance;
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
        uint deposited = 0;
        uint[] memory balances = new uint[](_strategies.length);
        for(uint i = 0; i < _strategies.length; i++){
            uint balance = IStrategy(_strategies[i]).deposited(_token);
            balances[i] = balance;
            deposited += balance;
        }
        return (deposited, balances);
    }
    
}
