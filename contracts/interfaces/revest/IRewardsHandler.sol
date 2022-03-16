// SPDX-License-Identifier: GNU-GPL v3.0 or later

pragma solidity >=0.8.0;

interface IRewardsHandler {
    struct UserBalance {
        uint256 allocPoint; // Allocation points
        uint256 lastMul;
    }

    function updateShares(uint256 fnftId, uint256 newShares) external;

    function getAllocPoint(uint256 fnftId) external view returns (uint256);

    function claimRewards(uint256 fnftId, address caller) external returns (bool);

    function setStakingContract(address stake) external;

    function getRewards(uint256 fnftId) external view returns (uint256);

    function depositReward(uint256 amount) external;
}
