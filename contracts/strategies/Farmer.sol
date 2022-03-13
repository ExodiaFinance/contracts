// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/security/Pausable.sol";

import "./IAssetAllocator.sol";
import "../ExodiaAccessControl.sol";
import "./TreasuryManager.sol";
import "./TreasuryDepositor.sol";
import "hardhat/console.sol";

struct FarmingData {
    uint relativeLimit; // 100_000 == 100%
    uint max;
    uint allocated;
    uint reserves;
    uint lastRebalance;
}

contract Farmer is ExodiaAccessControl, Pausable{
    
    mapping(address => FarmingData) farmingData;
    IAssetAllocator public allocator;
    address public treasuryManagerAddress;
    address public treasuryDepositorAddress;
    uint public minElapsedTime;

    event Rebalance(address indexed token, uint amount, int pnl);
    
    function initialize(
        address _allocator,
        address _treasuryManager,
        address _treasuryDepositor,
        address _roles
    ) public initializer{
        ExodiaAccessControlInitializable.initializeAccessControl(_roles);

        allocator = IAssetAllocator(_allocator);
        treasuryManagerAddress = _treasuryManager;
        treasuryDepositorAddress = _treasuryDepositor;
        ExodiaAccessControlInitializable.initializeAccessControl(_roles);
    }
    
    function setMinElapsedTimeRebalance(uint _minElapsedTime) external onlyStrategist {
        minElapsedTime = _minElapsedTime;
    }
    
    function rebalance(address _token) whenNotPaused external {
        require(farmingData[_token].lastRebalance + minElapsedTime < block.timestamp, "Farmer: cool down active");
        _rebalance(_token);
    }
    
    function forceRebalance(address _token) external onlyStrategist {
        _rebalance(_token);
    }
    
    function _rebalance(address _token) internal {
        IERC20 token = IERC20(_token);
        (uint target, int delta) = _getTargetAllocation(_token);
        if(delta > 0) {
            _getTreasuryManager().manage(_token, uint(delta));   
        }
        token.approve(address(allocator), target);
        uint balance = allocator.rebalance(_token, target);
        uint allocated = farmingData[_token].allocated;
        int pnl = int(target) - delta - int(allocated);
        _syncPNLWithTreasury(_token, pnl);
        if (delta < 0){ // withdrew token, check for slippage and return tokens
            uint returning = uint(delta * -1);
            uint withdrawn = token.balanceOf(address(this));
            int slippage = int(withdrawn) + delta; //amount of token gained or lost
            token.approve(treasuryDepositorAddress, withdrawn);
            if(slippage > 0) {
                _getTreasuryDepositor().returnWithProfits(_token, returning, uint(slippage));
            } else if(slippage < 0){
                _getTreasuryDepositor().returnWithLoss(_token, returning, uint(slippage * -1));
            } else {
                _getTreasuryDepositor().returnFunds(_token, returning);
            }
        }
        farmingData[_token].allocated = balance;
        farmingData[_token].lastRebalance = block.timestamp;
    }
    
    function _getTargetAllocation(address _token) internal view returns(uint, int){
        FarmingData storage limit = farmingData[_token];
        uint balance = _getTreasuryManager().balance(_token);
        uint allocated = allocator.allocatedBalance(_token);
        uint amount = (balance + allocated) * limit.relativeLimit / 100_000;
        if (amount > balance + allocated - limit.reserves){
            amount = balance + allocated - limit.reserves;
        } 
        if (limit.max > 0 && amount > limit.max){
            amount = limit.max;
        }
        int delta = int(amount) - int(allocated);
        return (amount, delta);
    }
    
    function _syncPNLWithTreasury(address _token, int pnl) internal {
        if(pnl > 0){
            _getTreasuryDepositor().registerProfit(_token, uint(pnl));
        } else if (pnl < 0) {
            _getTreasuryDepositor().registerLoss(_token, uint(pnl*-1));
        }
    }
    
    function getLimit(address _token) external view returns(uint){
        (uint limit,) = _getTargetAllocation(_token);
        return limit;
    }
    
    function setLimit(address _token, uint _relativeLimit, uint _max, uint _reserves) external onlyStrategist {
        farmingData[_token].relativeLimit = _relativeLimit;
        farmingData[_token].max = _max;
        farmingData[_token].reserves = _reserves;
    }

    function harvest(address _token) external whenNotPaused {
        allocator.collectRewards(_token);
    }
    
    function withdraw(address _token) external onlyStrategist {
        
    }
    
    function setTreasuryDepositor(address _treasuryDepositor) external onlyArchitect {
        treasuryDepositorAddress = _treasuryDepositor;
    }
    
    function _getTreasuryDepositor() internal view returns (TreasuryDepositor){
        return TreasuryDepositor(treasuryDepositorAddress);
    }

    function setTreasuryManager(address _treasuryManager) external onlyArchitect {
        treasuryManagerAddress = _treasuryManager;
    }

    function _getTreasuryManager() internal view returns (TreasuryManager){
        return TreasuryManager(treasuryManagerAddress);
    }
    
    function _returnStuckTokens(address _token) external {
        _getTreasuryDepositor().returnFunds(_token, IERC20(_token).balanceOf(address(this)));
    }
    
    function setAllocator(address _allocator) external onlyArchitect {
        allocator = IAssetAllocator(_allocator);
    }
    
}
