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
    uint public constant PRECISION = 10**27;
    
    mapping(uint => UserBalance) public tokenBalances;

    uint public globalMul = PRECISION;
    uint public totalAllocPoint = 1;

    constructor(address _rewardToken) {
        REWARD_ADDRESS = _rewardToken;
    }

    function updateShares(uint fnftId, uint newAllocPoint) external override onlyStakingContract {
        totalAllocPoint = totalAllocPoint + newAllocPoint - getAllocPoint(fnftId);

        tokenBalances[fnftId].allocPoint = newAllocPoint;
        tokenBalances[fnftId].lastMul = globalMul;
    }
    
    function claimRewards(uint fnftId, address user) external override onlyStakingContract returns (bool) {
        UserBalance storage basicBalance = _getBalance(fnftId);
        uint amount = rewardsOwed(basicBalance);
        basicBalance.lastMul = getMul();

        IERC20(REWARD_ADDRESS).safeTransfer(user, amount);
        return amount > 0;
    }

    function getRewards(uint fnftId) external view override returns (uint) {
        UserBalance memory balance = _getBalance(fnftId);
        uint rewards = rewardsOwed(balance);
        return rewards;
    }

    function getAllocPoint(uint fnftId) public view override returns (uint) {
        return tokenBalances[fnftId].allocPoint;
    }
    
    function getTotalAllocPoint() external view returns (uint){
        return totalAllocPoint;
    }

    function setStakingContract(address stake) external override onlyPolicy {
        STAKING = stake;
    }

    // INTERNAL FUNCTIONS

    /**
     * View-only function. Does not update any balances.
     */
    function rewardsOwed(UserBalance memory basicBalance) public view returns (uint) {
        uint globalBalance = IERC20(REWARD_ADDRESS).balanceOf(address(this));
        uint rewards = (getMul() - basicBalance.lastMul) * basicBalance.allocPoint;
        uint tokenAmount = rewards / PRECISION;
        return tokenAmount;
    }

    function _getBalance(uint fnftId) internal view returns (UserBalance storage) {
        return tokenBalances[fnftId];
    }    
    
    function getBalance(uint fnftId) public view returns (UserBalance memory) {
        return _getBalance(fnftId);
    }

    function depositReward(uint amount) external override {
        IERC20(REWARD_ADDRESS).safeTransferFrom(msg.sender, address(this), amount);
        adjustMuls(amount);
    }

    function adjustMuls(uint amount) private {
        if(totalAllocPoint > 0) {
            uint mulInc = (amount * PRECISION) / totalAllocPoint;
            globalMul = globalMul + mulInc;
        }
    }


    function getMul() public view returns (uint) {
        return globalMul;
    }

    function setMul(uint newMul) internal {
        globalMul = newMul;
    }

    // Admin functions for migration

    function manualMapRVSTBasic(
        uint[] memory fnfts,
        uint[] memory allocPoints
    ) external onlyPolicy {
        for(uint i = 0; i < fnfts.length; i++) {
            UserBalance storage userBal = tokenBalances[fnfts[i]];
            userBal.allocPoint = allocPoints[i];
            userBal.lastMul = globalMul;
        }
    }
    
    function manualSetAllocPoints(uint _totalBasic) external onlyPolicy {
        totalAllocPoint = _totalBasic;
    }

    function _msgSender() internal returns (address){
        return msg.sender;
    }
    
    modifier onlyStakingContract() {
        require(_msgSender() != address(0), "E004");
        require(_msgSender() == STAKING, "E060");
        _;
    }



}
