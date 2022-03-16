// SPDX-License-Identifier: GNU-GPL v3.0 or later

pragma solidity ^0.8.0;

import "../interfaces/revest/IRewardsHandler.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../Policy.sol";

contract LLSRewardHandler is IRewardsHandler, Policy {
    using SafeERC20 for IERC20;

    address internal immutable REWARD_ADDRESS;
    address public STAKING;
    uint256 public constant PRECISION = 10**27;

    mapping(uint256 => UserBalance) public tokenBalances;

    uint256 public globalMul = PRECISION;
    uint256 public totalAllocPoint = 1;

    constructor(address _rewardToken) {
        REWARD_ADDRESS = _rewardToken;
    }

    function updateShares(uint256 fnftId, uint256 newAllocPoint)
        external
        override
        onlyStakingContract
    {
        totalAllocPoint = totalAllocPoint + newAllocPoint - getAllocPoint(fnftId);

        tokenBalances[fnftId].allocPoint = newAllocPoint;
        tokenBalances[fnftId].lastMul = globalMul;
    }

    function claimRewards(uint256 fnftId, address user)
        external
        override
        onlyStakingContract
        returns (bool)
    {
        UserBalance storage basicBalance = _getBalance(fnftId);
        uint256 amount = rewardsOwed(basicBalance);
        basicBalance.lastMul = getMul();

        IERC20(REWARD_ADDRESS).safeTransfer(user, amount);
        return amount > 0;
    }

    function getRewards(uint256 fnftId) external view override returns (uint256) {
        UserBalance memory balance = _getBalance(fnftId);
        uint256 rewards = rewardsOwed(balance);
        return rewards;
    }

    function getAllocPoint(uint256 fnftId) public view override returns (uint256) {
        return tokenBalances[fnftId].allocPoint;
    }

    function getTotalAllocPoint() external view returns (uint256) {
        return totalAllocPoint;
    }

    function setStakingContract(address stake) external override onlyPolicy {
        STAKING = stake;
    }

    // INTERNAL FUNCTIONS

    /**
     * View-only function. Does not update any balances.
     */
    function rewardsOwed(UserBalance memory basicBalance) public view returns (uint256) {
        uint256 globalBalance = IERC20(REWARD_ADDRESS).balanceOf(address(this));
        uint256 rewards = (getMul() - basicBalance.lastMul) * basicBalance.allocPoint;
        uint256 tokenAmount = rewards / PRECISION;
        return tokenAmount;
    }

    function _getBalance(uint256 fnftId) internal view returns (UserBalance storage) {
        return tokenBalances[fnftId];
    }

    function getBalance(uint256 fnftId) public view returns (UserBalance memory) {
        return _getBalance(fnftId);
    }

    function depositReward(uint256 amount) external override {
        IERC20(REWARD_ADDRESS).safeTransferFrom(msg.sender, address(this), amount);
        adjustMuls(amount);
    }

    function adjustMuls(uint256 amount) private {
        if (totalAllocPoint > 0) {
            uint256 mulInc = (amount * PRECISION) / totalAllocPoint;
            globalMul = globalMul + mulInc;
        }
    }

    function getMul() public view returns (uint256) {
        return globalMul;
    }

    function setMul(uint256 newMul) internal {
        globalMul = newMul;
    }

    // Admin functions for migration

    function manualMapRVSTBasic(uint256[] memory fnfts, uint256[] memory allocPoints)
        external
        onlyPolicy
    {
        for (uint256 i = 0; i < fnfts.length; i++) {
            UserBalance storage userBal = tokenBalances[fnfts[i]];
            userBal.allocPoint = allocPoints[i];
            userBal.lastMul = globalMul;
        }
    }

    function manualSetAllocPoints(uint256 _totalBasic) external onlyPolicy {
        totalAllocPoint = _totalBasic;
    }

    function _msgSender() internal returns (address) {
        return msg.sender;
    }

    modifier onlyStakingContract() {
        require(_msgSender() != address(0), "E004");
        require(_msgSender() == STAKING, "E060");
        _;
    }
}
