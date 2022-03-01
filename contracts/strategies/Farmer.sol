// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./IAssetAllocator.sol";
import "../ExodiaAccessControl.sol";
import "./TreasuryManager.sol";
import "./TreasuryDepositor.sol";
    
struct FarmingData {
    uint relativeLimit; // 100_000 == 100%
    uint max;
    uint allocated;
    uint reserves;
}

contract Farmer is ExodiaAccessControl{
    
    mapping(address => FarmingData) farmingData;
    IAssetAllocator public allocator;
    address public treasuryManagerAddress;
    address public treasuryDepositorAddress;
    uint public minElapsedTime;
    uint lastWork;

    constructor(
        address _allocator,
        address _treasuryManager,
        address _treasuryDepositor,
        address _roles
    ) ExodiaAccessControl(_roles) {
        allocator = IAssetAllocator(_allocator);
        treasuryManagerAddress = _treasuryManager;
        treasuryDepositorAddress = _treasuryDepositor;
    }
    
    function setMinElapsedTimeRebalance(uint _minElapsedTime) external onlyArchitect {
        minElapsedTime = _minElapsedTime;
    }
    
    function work(address _token) external {
        require(lastWork+minElapsedTime < block.timestamp, "Too soon");
        _work(_token);
    }
    
    function forceWork(address _token) external {
        _work(_token);
    }
    
    function _work(address _token) internal {
        IERC20 token = IERC20(_token);
        (uint target, int delta) = _getTargetAllocation(_token);
        if(delta > 0) {
            _getTreasuryManager().manage(_token, uint(delta));   
        }
        token.approve(address(allocator), target);
        uint balance = allocator.rebalance(_token, target);
        uint allocated = farmingData[_token].allocated;
        int pnl = int(target) - delta - int(allocated);
        int slippage = int(target) - int(balance);
        _syncPNLWithTreasury(_token, pnl - slippage);
        if (delta < 0) { // Reduced allocation
            uint withdrawn = uint(delta*-1);
            if(slippage > 0) {
                _getTreasuryDepositor().returnWithLoss(_token, withdrawn, uint(slippage));
            } else if(slippage < 0){
                _getTreasuryDepositor().returnWithProfits(_token, withdrawn, uint(slippage * -1));
            } else {
                _getTreasuryDepositor().returnFunds(_token, withdrawn);
            }
        }  
        farmingData[_token].allocated = balance;
    }
    
    function _getTargetAllocation(address _token) internal view returns(uint, int){
        FarmingData storage limit = farmingData[_token];
        uint balance = _getTreasuryManager().balance(_token);
        uint allocated = allocator.allocatedBalance(_token);
        uint amount = (balance + allocated) * limit.relativeLimit / 100_000;
        if (amount > balance - limit.reserves){
            amount = balance - limit.reserves;
        }
        if (limit.max > 0 && amount > limit.max){
            amount = limit.max;
        }
        int delta = int(amount) - int(allocated) ;
        return (amount, delta);
    }
    
    function _syncPNLWithTreasury(address _token, int pnl) internal {
        if(pnl > 0){
            _getTreasuryManager().addARFVToTreasury(_token, uint(pnl));
        } else if (pnl < 0) {
            _getTreasuryDepositor().removeARFVFromTreasury(_token, uint(pnl*-1));
        }
    }
    
    function getLimit(address _token) external view returns(uint){
        (uint limit,) = _getTargetAllocation(_token);
        return limit;
    }
    
    function setLimit(address _token, uint _relativeLimit, uint _max) external onlyStrategist {
        farmingData[_token].relativeLimit = _relativeLimit;
        farmingData[_token].max = _max;
    }

    function harvest() external {
        
    }
    
    function withdraw(address _token) external {
        
    }
    
    function _borrow(address _token) external {}
    
    function _getTreasuryDepositor() internal view returns (TreasuryDepositor){
        return TreasuryDepositor(treasuryDepositorAddress);
    }

    function _getTreasuryManager() internal view returns (TreasuryManager){
        return TreasuryManager(treasuryManagerAddress);
    }
}
