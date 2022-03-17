// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "../ExodiaAccessControl.sol";
import "./IStrategy.sol";
import "./IAssetAllocator.sol";
import "./IAllocationCalculator.sol";
import "./TreasuryDepositor.sol";

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
        ExodiaAccessControlInitializable.initializeAccessControl(_roles);
    }

    function setAllocationCalculator(address _calculator) external onlyArchitect {
        allocationCalculator = _calculator;
    }

    function _getAllocationCalculator() internal view returns (IAllocationCalculator) {
        return IAllocationCalculator(allocationCalculator);
    }

    function collectProfits(address _token) external override onlyMachine {
        address[] memory strategies = _getStrategies(_token);
        for (uint256 i = 0; i < strategies.length; i++) {
            IStrategy(strategies[i]).collectProfits(_token, address(this));
        }
        IERC20 token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        token.approve(treasuryDepositorAddress, balance);
        _getTreasuryDepositor().returnWithProfits(_token, 0, balance);
    }

    function collectRewards(address _token) external override onlyMachine {
        address[] memory strategies = _getStrategies(_token);
        for (uint256 i = 0; i < strategies.length; i++) {
            address[] memory rewardTokens = IStrategy(strategies[i]).collectRewards(
                _token,
                address(this)
            );
            for (uint256 i = 0; i < rewardTokens.length; i++) {
                IERC20 token = IERC20(rewardTokens[i]);
                uint256 balance = token.balanceOf(address(this));
                token.approve(treasuryDepositorAddress, balance);
                _getTreasuryDepositor().returnWithProfits(rewardTokens[i], 0, balance);
            }
        }
    }

    function rebalance(address _token, uint256 _amount)
        external
        override
        onlyMachine
        returns (uint256)
    {
        address[] memory strategies = _getStrategies(_token);
        require(strategies.length > 0, "no strategies");
        (uint256 allocatedBalance, uint256[] memory balances) = _balance(
            _token,
            strategies
        );
        (uint256[] memory targetAllocations, ) = _calculateAllocations(_token, _amount);
        (uint256 available, uint256 expected, uint256 allocated) = _withdrawTargetExcess(
            _token,
            balances,
            targetAllocations,
            strategies
        );
        if (_amount > allocatedBalance) {
            available = _amount - allocatedBalance + available;
            expected = _amount - allocatedBalance + expected;
        }
        allocated += _allocateToTarget(
            _token,
            balances,
            targetAllocations,
            strategies,
            available,
            expected
        );
        return allocated;
    }

    function _withdrawTargetExcess(
        address _token,
        uint256[] memory _balances,
        uint256[] memory _targetAllocations,
        address[] memory _strategies
    )
        internal
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        uint256 allocated = 0;
        uint256 expectedToWithdraw = 0;
        uint256 actuallyWithdrawn = 0;
        for (uint256 i = 0; i < _strategies.length; i++) {
            if (_balances[i] > _targetAllocations[i]) {
                uint256 amount = _balances[i] - _targetAllocations[i];
                allocated += _balances[i] - amount;
                expectedToWithdraw += amount;
                actuallyWithdrawn += IStrategy(_strategies[i]).withdrawTo(
                    _token,
                    amount,
                    msg.sender
                );
            }
        }
        return (actuallyWithdrawn, expectedToWithdraw, allocated);
    }

    function _allocateToTarget(
        address _token,
        uint256[] memory _balances,
        uint256[] memory _targetAllocations,
        address[] memory _strategies,
        uint256 _actual,
        uint256 _expected
    ) internal returns (uint256) {
        uint256 allocated = 0;
        for (uint256 i = 0; i < _strategies.length; i++) {
            if (_balances[i] < _targetAllocations[i]) {
                uint256 amount = _targetAllocations[i] - _balances[i];
                if (_actual != _expected) {
                    // Adjust amount for slippage
                    amount = (_actual * amount) / _expected;
                }
                allocated += _balances[i] + amount;
                address strategyAddress = _strategies[i];
                IERC20(_token).transferFrom(msg.sender, strategyAddress, amount);
                IStrategy(strategyAddress).deploy(_token);
            }
        }
        return allocated;
    }

    function _getStrategies(address _token) internal view returns (address[] memory) {
        return IAllocationCalculator(allocationCalculator).getStrategies(_token);
    }

    function _calculateAllocations(address _token, uint256 _manageable)
        internal
        view
        returns (uint256[] memory, uint256)
    {
        return _getAllocationCalculator().calculateAllocation(_token, _manageable);
    }

    function allocate(address _token, uint256 _amount) external {
        address[] memory strategies = _getStrategies(_token);
        (, uint256[] memory balances) = _deposits(_token, strategies);
        (uint256[] memory allocations, uint256 allocated) = _calculateAllocations(
            _token,
            _amount
        );
        _allocateToTarget(_token, balances, allocations, strategies, 0, 0);
    }

    function _getTreasuryDepositor() internal view returns (TreasuryDepositor) {
        return TreasuryDepositor(treasuryDepositorAddress);
    }

    //TODO: add tests
    function withdrawFromStrategy(
        address _token,
        address _strategy,
        uint256 _amount
    ) external override onlyStrategist {
        _withdrawFromStrategy(_token, _strategy, _amount);
        _getTreasuryDepositor().deposit(_token, _amount);
    }

    function _withdrawFromStrategy(
        address _token,
        address _strategy,
        uint256 _amount
    ) internal {
        uint256 amount = IStrategy(_strategy).withdrawTo(_token, _amount, msg.sender);
    }

    /*    function sendToTreasury(address _token, uint _amount) external {
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        IERC20(_token).approve(treasuryDepositorAddress, _amount);
        _getTreasuryDepositor().deposit(_token, _amount);
    }*/
    //TODO: add tests
    function emergencyWithdrawFromStrategy(address[] calldata _tokens, address _strategy)
        external
        override
        onlyStrategist
    {
        for (uint256 i = 0; i < _tokens.length; i++) {
            address token = _tokens[i];
            IStrategy(_strategy).emergencyWithdrawTo(token, msg.sender);
            uint256 balance = IERC20(token).balanceOf(address(this));
            _getTreasuryDepositor().deposit(token, balance);
        }
    }

    //TODO: add tests
    function allocatedBalance(address _token) external view override returns (uint256) {
        (uint256 balance, ) = _balance(
            _token,
            IAllocationCalculator(allocationCalculator).getStrategies(_token)
        );
        return balance;
    }

    function _balance(address _token, address[] memory _strategies)
        internal
        view
        returns (uint256, uint256[] memory)
    {
        uint256 allocated = 0;
        uint256[] memory balances = new uint256[](_strategies.length);
        for (uint256 i = 0; i < _strategies.length; i++) {
            uint256 balance = IStrategy(_strategies[i]).balance(_token);
            balances[i] = balance;
            allocated += balance;
        }
        return (allocated, balances);
    }

    function _deposits(address _token, address[] memory _strategies)
        internal
        view
        returns (uint256, uint256[] memory)
    {
        uint256 deposited = 0;
        uint256[] memory balances = new uint256[](_strategies.length);
        for (uint256 i = 0; i < _strategies.length; i++) {
            uint256 balance = IStrategy(_strategies[i]).deposited(_token);
            balances[i] = balance;
            deposited += balance;
        }
        return (deposited, balances);
    }
}
