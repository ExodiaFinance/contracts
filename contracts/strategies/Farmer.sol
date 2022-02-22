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
        uint limit = _getLimit(_token);
        uint allocated = farmingData[_token].allocated;
        if (allocated > limit) {
            allocator.rebalance(_token, limit);
            uint expectedToWithdraw = allocated - limit;
            uint withdrawn = IERC20(_token).balanceOf(address(this));
            IERC20(_token).approve(treasuryDepositorAddress, withdrawn);
            if (withdrawn > expectedToWithdraw){
                _getTreasuryDepositor().returnWithProfits(_token, expectedToWithdraw, withdrawn - expectedToWithdraw);
            } else if (withdrawn < expectedToWithdraw) {
                _getTreasuryDepositor().returnWithLoss(_token, expectedToWithdraw, expectedToWithdraw - withdrawn);
            } else {
                _getTreasuryDepositor().returnFunds(_token, expectedToWithdraw);
            }
        } else {
            _getTreasuryManager().manage(_token, limit - allocated);
            allocator.rebalance(_token, limit);
        }       
    }
    
    function _getLimit(address _token) internal view returns(uint){
        FarmingData storage limit = farmingData[_token];
        uint balance = _getTreasuryManager().balance(_token);
        uint allocated = farmingData[_token].allocated;
        uint amount = (balance + allocated) * limit.relativeLimit / 100_000;
        if (amount > balance - limit.reserves){
            amount = balance - limit.reserves;
        }
        if (limit.max > 0 && amount > limit.max){
            amount = limit.max;
        }
        return amount;
    }
    
    function getLimit(address _token) external view returns(uint){
        return _getLimit(_token);
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
