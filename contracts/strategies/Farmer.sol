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
    uint256 relativeLimit; // 100_000 == 100%
    uint256 max;
    uint256 allocated;
    uint256 reserves;
    uint256 lastRebalance;
}

contract Farmer is ExodiaAccessControl, Pausable {
    mapping(address => FarmingData) farmingData;
    IAssetAllocator public allocator;
    address public treasuryManagerAddress;
    address public treasuryDepositorAddress;
    uint256 public minElapsedTime;

    event Rebalance(address indexed token, uint256 amount, int256 pnl);

    function initialize(
        address _allocator,
        address _treasuryManager,
        address _treasuryDepositor,
        address _roles
    ) public initializer {
        ExodiaAccessControlInitializable.initializeAccessControl(_roles);

        allocator = IAssetAllocator(_allocator);
        treasuryManagerAddress = _treasuryManager;
        treasuryDepositorAddress = _treasuryDepositor;
        ExodiaAccessControlInitializable.initializeAccessControl(_roles);
    }

    function setMinElapsedTimeRebalance(uint256 _minElapsedTime) external onlyStrategist {
        minElapsedTime = _minElapsedTime;
    }

    function rebalance(address _token) external whenNotPaused {
        require(
            farmingData[_token].lastRebalance + minElapsedTime < block.timestamp,
            "Farmer: cool down active"
        );
        _rebalance(_token);
    }

    function forceRebalance(address _token) external onlyStrategist {
        _rebalance(_token);
    }

    function _rebalance(address _token) internal {
        IERC20 token = IERC20(_token);
        (uint256 target, int256 delta) = _getRebalanceTarget(_token);
        if (delta > 0) {
            _getTreasuryManager().manage(_token, uint256(delta));
        }
        token.approve(address(allocator), target);
        uint256 balance = allocator.rebalance(_token, target);
        uint256 allocated = farmingData[_token].allocated;
        int256 pnl = int256(target) - delta - int256(allocated);
        _syncPNLWithTreasury(_token, pnl);
        if (delta < 0) {
            // withdrew token, check for slippage and return tokens
            uint256 returning = uint256(delta * -1);
            uint256 withdrawn = token.balanceOf(address(this));
            int256 slippage = int256(withdrawn) + delta; //amount of token gained or lost
            token.approve(treasuryDepositorAddress, withdrawn);
            if (slippage > 0) {
                _getTreasuryDepositor().returnWithProfits(
                    _token,
                    returning,
                    uint256(slippage)
                );
            } else if (slippage < 0) {
                _getTreasuryDepositor().returnWithLoss(
                    _token,
                    returning,
                    uint256(slippage * -1)
                );
            } else {
                _getTreasuryDepositor().returnFunds(_token, returning);
            }
        }
        farmingData[_token].allocated = balance;
        farmingData[_token].lastRebalance = block.timestamp;
    }

    function _getRebalanceTarget(address _token) internal view returns (uint256, int256) {
        uint256 balance = _getTreasuryManager().balance(_token);
        uint256 allocated = allocator.allocatedBalance(_token);
        return _getTargetAllocation(_token, balance, allocated);
    }

    function _getAllocationTarget(address _token)
        internal
        view
        returns (uint256, int256)
    {
        uint256 balance = _getTreasuryManager().balance(_token);
        return _getTargetAllocation(_token, balance, farmingData[_token].allocated);
    }

    function _getTargetAllocation(
        address _token,
        uint256 _balance,
        uint256 _allocated
    ) internal view returns (uint256, int256) {
        FarmingData storage limit = farmingData[_token];
        uint256 amount = ((_balance + _allocated) * limit.relativeLimit) / 100_000;
        if (amount > _balance + _allocated - limit.reserves) {
            amount = _balance + _allocated - limit.reserves;
        }
        if (limit.max > 0 && amount > limit.max) {
            amount = limit.max;
        }
        int256 delta = int256(amount) - int256(_allocated);
        return (amount, delta);
    }

    function _syncPNLWithTreasury(address _token, int256 pnl) internal {
        if (pnl > 0) {
            _getTreasuryDepositor().registerProfit(_token, uint256(pnl));
        } else if (pnl < 0) {
            _getTreasuryDepositor().registerLoss(_token, uint256(pnl * -1));
        }
    }

    function getLimit(address _token) external view returns (uint256) {
        (uint256 limit, ) = _getRebalanceTarget(_token);
        return limit;
    }

    function setLimit(
        address _token,
        uint256 _relativeLimit,
        uint256 _max,
        uint256 _reserves
    ) external onlyStrategist {
        farmingData[_token].relativeLimit = _relativeLimit;
        farmingData[_token].max = _max;
        farmingData[_token].reserves = _reserves;
    }

    function harvest(address _token) external whenNotPaused {
        allocator.collectRewards(_token);
    }

    function allocate(address _token) external whenNotPaused {
        IERC20 token = IERC20(_token);
        (uint256 target, int256 delta) = _getAllocationTarget(_token);
        if (delta > 0) {
            _getTreasuryManager().manage(_token, uint256(delta));
            token.approve(address(allocator), uint256(delta));
            allocator.allocate(_token, target);
            farmingData[_token].allocated = target;
        }
    }

    function setTreasuryDepositor(address _treasuryDepositor) external onlyArchitect {
        treasuryDepositorAddress = _treasuryDepositor;
    }

    function _getTreasuryDepositor() internal view returns (TreasuryDepositor) {
        return TreasuryDepositor(treasuryDepositorAddress);
    }

    function setTreasuryManager(address _treasuryManager) external onlyArchitect {
        treasuryManagerAddress = _treasuryManager;
    }

    function _getTreasuryManager() internal view returns (TreasuryManager) {
        return TreasuryManager(treasuryManagerAddress);
    }

    function _returnStuckTokens(address _token) external onlyStrategist {
        _getTreasuryDepositor().deposit(
            _token,
            IERC20(_token).balanceOf(address(this))
        );
    }

    function setAllocator(address _allocator) external onlyArchitect {
        allocator = IAssetAllocator(_allocator);
    }
}
