// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../Policy.sol";
import "./IStrategy.sol";
import "./IAssetAllocator.sol";

import "hardhat/console.sol";
import "../ExodiaAccessControlInitializable.sol";

// Info of each user.
struct UserInfo {
    uint256 amount; // How many LP tokens the user has provided.
    uint256 rewardDebt; // Reward debt. See explanation below.
    //
    // We do some fancy math here. Basically, any point in time, the amount of BEETS
    // entitled to a user but is pending to be distributed is:
    //
    //   pending reward = (user.amount * pool.accBeetsPerShare) - user.rewardDebt
    //
    // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
    //   1. The pool's `accBeetsPerShare` (and `lastRewardBlock`) gets updated.
    //   2. User receives the pending reward sent to his/her address.
    //   3. User's `amount` gets updated.
    //   4. User's `rewardDebt` gets updated.
}

interface IMasterchef {
    function deposit(
        uint256 _pid,
        uint256 _amount,
        address _to
    ) external;

    function withdrawAndHarvest(
        uint256 _pid,
        uint256 _amount,
        address _to
    ) external;

    function harvest(uint256 _pid, address _to) external;

    function harvestAll(uint256[] calldata _pids, address _to) external;

    function userInfo(uint256 _pid, address _farmer)
        external
        view
        returns (UserInfo memory);

    function lpTokens(uint256 _pid) external view returns (address);

    function rewarder(uint256 _pid) external view returns (address);

    function emergencyWithdraw(uint256 _pid, address _to) external;
}

interface IRewarder {
    function rewardToken() external view returns (address);
}

contract MasterChefStrategy is IStrategy, ExodiaAccessControlInitializable {
    mapping(address => uint256) public tokenFarmPid;
    mapping(address => uint256) public override deposited;

    address public masterChef;
    address public rewardToken;
    address public allocator;

    function initialize(
        address _masterChef,
        address _rewardToken,
        address _allocator,
        address _roles
    ) public initializer {
        masterChef = _masterChef;
        rewardToken = _rewardToken;
        allocator = _allocator;
        ExodiaAccessControlInitializable.initializeAccessControl(_roles);
    }

    function getPid(address _token) external view returns (uint256) {
        return _getPid(_token);
    }

    function _getPid(address _token) internal view returns (uint256) {
        return tokenFarmPid[_token];
    }

    function setPid(address _token, uint256 _pid) external onlyStrategist {
        require(
            IMasterchef(masterChef).lpTokens(_pid) == _token,
            "MCS: PID does not match token"
        );
        tokenFarmPid[_token] = _pid;
    }

    function deploy(address _token) external override {
        uint256 pid = _getPid(_token);
        IERC20 token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        token.approve(masterChef, balance);
        IMasterchef(masterChef).deposit(pid, balance, address(this));
        deposited[_token] += balance;
    }

    function withdrawTo(
        address _token,
        uint256 _amount,
        address _to
    ) external override onlyAssetAllocator returns (uint256) {
        uint256 pid = _getPid(_token);
        IMasterchef(masterChef).withdrawAndHarvest(pid, _amount, address(this));
        _sendTo(rewardToken, _to);
        IERC20(_token).transfer(_to, _amount);
        deposited[_token] -= _amount;
        return _amount;
    }

    function emergencyWithdrawTo(address _token, address _to)
        external
        override
        onlyAssetAllocator
        returns (uint256)
    {
        IMasterchef(masterChef).emergencyWithdraw(_getPid(_token), address(this));
        uint256 balanceOf = IERC20(_token).balanceOf(address(this));
        IERC20(_token).transfer(_to, balanceOf);
        deposited[_token] = 0;
        return balanceOf;
    }

    function collectProfits(address _token, address _to)
        external
        override
        onlyAssetAllocator
        returns (int256)
    {
        // This farm creates yields from the reward token
        return 0;
    }

    function collectRewards(address _token, address _to)
        public
        override
        onlyAssetAllocator
        returns (address[] memory)
    {
        uint256 pid = _getPid(_token);
        IMasterchef(masterChef).harvest(pid, _to);
        address rewarder = IMasterchef(masterChef).rewarder(pid);
        if (rewarder != address(0)) {
            address[] memory rewardTokens = new address[](2);
            rewardTokens[0] = rewardToken;
            rewardTokens[1] = IRewarder(rewarder).rewardToken();
            return rewardTokens;
        }
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = rewardToken;
        return rewardTokens;
    }

    function balance(address _token) external view override returns (uint256) {
        uint256 pid = _getPid(_token);
        return IMasterchef(masterChef).userInfo(pid, address(this)).amount;
    }

    function exit(address _token, bool _emergency) external onlyStrategist {
        uint256 pid = _getPid(_token);
        if (_emergency) {
            IMasterchef(masterChef).emergencyWithdraw(pid, address(this));
        } else {
            uint256 balanceOf = IMasterchef(masterChef)
                .userInfo(pid, address(this))
                .amount;
            IMasterchef(masterChef).withdrawAndHarvest(pid, balanceOf, address(this));
        }
    }

    function extractToDAO(address _token) external onlyStrategist {
        _sendTo(_token, roles.DAO_ADDRESS());
    }

    function _sendTo(address _token, address _to) internal {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        IERC20(_token).transfer(_to, balance);
    }

    modifier onlyAssetAllocator() {
        require(msg.sender == allocator, "MCS: caller is not allocator");
        _;
    }
}
