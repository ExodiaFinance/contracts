// SPDX-License-Identifier: GNU-GPL v3.0 or later

pragma solidity >=0.8.0;

interface IRewardsHandler {

    struct UserBalance {
        uint allocPoint; // Allocation points
        uint lastMul;
    }

    function updateShares(uint fnftId, uint newShares) external;

    function getAllocPoint(uint fnftId) external view returns (uint);

    function claimRewards(uint fnftId, address caller) external returns (bool);

    function setStakingContract(address stake) external;

    function getRewards(uint fnftId) external view returns (uint);

    function depositReward(uint amount) external;
}
