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
import "./TreasuryManager.sol";
import "./TreasuryDepositor.sol";
import "hardhat/console.sol";

contract AssetAllocator is ExodiaAccessControl, IAssetAllocator {
    using SafeMath for uint256;
    
    address public treasuryManagerAddress;
    address public treasuryDepositorAddress;
    address public allocationCalculator;
    mapping(address => uint) public allocatedTokens;
    mapping(address => uint) public lastRebalance;
    uint public minElapsedTime;
    
    constructor(
        address _treasuryManager,
        address _treasuryDepositor,
        address _allocationCalculator, 
        address _roles
    ) ExodiaAccessControl (_roles){
        treasuryManagerAddress = _treasuryManager;
        treasuryDepositorAddress = _treasuryDepositor;
        allocationCalculator = _allocationCalculator;
    }

    function setAllocationCalculator(address _calculator) external onlyArchitect {
        allocationCalculator = _calculator;
    }
    
    function setMinElapsedTimeRebalance(uint _minElapsedTime) external onlyArchitect {
        minElapsedTime = _minElapsedTime;
    }
    
    function _getAllocationCalculator() internal view returns (IAllocationCalculator){
        return IAllocationCalculator(allocationCalculator);
    }
    
    function collectProfits(address _token) external override {}
    
    function collectRewards(address _token) external override {}
    
    function forceRebalance(address _token) external onlyStrategist {
        _rebalance(_token);
    }
    
    function rebalance(address _token) external override onlyMachine {
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
        _returnUnallocated(_token, arfv, allocated);
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
        _returnUnallocated(_token, manageable, allocated);
    }
    
    function _manage(address _token) internal returns(uint){
        TreasuryManager treasuryManager = _getTreasuryManager();
        uint balance = treasuryManager.balance(_token);
        _getTreasuryManager().manage(_token, balance);
        return balance;
    }
    
    function _getTreasuryManager() internal view returns (TreasuryManager){
        return TreasuryManager(treasuryManagerAddress);
    }
    
    /**
        @notice withdraws ARFV token
        */
    function _returnUnallocated(
        address _token, 
        uint _manageable,
        uint _allocated
    ) internal {
        uint balance = IERC20(_token).balanceOf(address(this));
        IERC20(_token).approve(treasuryDepositorAddress, balance);
        TreasuryDepositor(treasuryDepositorAddress).deposit(_token, balance);
        if(_manageable > _allocated){
            uint loss = _manageable.sub(_allocated);
            _getTreasuryDepositor().removeARFVFromTreasury(_token, loss);
        } else if (_manageable < _allocated){
            uint profits = _allocated.sub(_manageable);
            _getTreasuryManager().addARFVToTreasury(_token, profits);
        }
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
        allocatedTokens[_token] -= _amountToAllocation(_strategy, _token, _amount);
        uint amount = IStrategy(_strategy).withdraw(_token, _amount);
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
            allocatedTokens[token] -= IStrategy(_strategy).deposited(token);
            IStrategy(_strategy).emergencyWithdraw(token);
            uint balance = IERC20(token).balanceOf(address(this));
            _getTreasuryDepositor().deposit(token, balance);
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
