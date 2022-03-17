// SPDX-License-Identifier: MIT
pragma solidity >=0.7.5;

interface IStrategy {
    function deploy(address _token) external;

    function withdrawTo(
        address _token,
        uint256 _amount,
        address _to
    ) external returns (uint256);

    function emergencyWithdrawTo(address _token, address _to) external returns (uint256);

    // Return the difference between amount deposited and balance
    function collectProfits(address _token, address _to) external returns (int256);

    // Returns the rewards that are !_token
    function collectRewards(address _token, address _to)
        external
        returns (address[] memory);

    // Returns the amount of tokens deposited by the asset allocator
    function deposited(address _token) external view returns (uint256);

    // Returns the amount of tokens in the strategy
    function balance(address _token) external view returns (uint256);
}
