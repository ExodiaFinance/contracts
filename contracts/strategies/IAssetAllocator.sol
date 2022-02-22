// SPDX-License-Identifier: MIT
pragma solidity >=0.7.5;
pragma abicoder v2;

interface IAssetAllocator {

    function collectProfits(address _token) external;
    function collectRewards(address _token) external;
    function rebalance(address _token, uint _amount) external returns(uint);
    function sendToTreasury(address _token, uint _amount) external;
    
    function withdrawFromStrategy(
        address _token,
        address _strategy,
        uint _amount
    ) external;
    
    function emergencyWithdrawFromStrategy(
        address[] calldata _tokens,
        address _strategy
    ) external;
    
    function allocatedBalance(address _token) external view returns (uint);
    
}
