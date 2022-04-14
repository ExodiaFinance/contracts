// SPDX-License-Identifier: MIT
pragma solidity >=0.7.5;
pragma abicoder v2;

interface IAssetAllocator {
    function collectProfits(address _token) external;

    function collectRewards(address _token) external;

    function rebalance(address _token, uint256 _amount) external returns (uint256);

    function allocate(address _token, uint256 _amount) external;

    function withdrawFromStrategy(
        address _token,
        address _strategy,
        uint256 _amount
    ) external;

    function emergencyWithdrawFromStrategy(address[] calldata _tokens, address _strategy)
        external;

    function allocatedBalance(address _token) external returns (uint256);
}
