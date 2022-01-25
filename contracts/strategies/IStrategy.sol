// SPDX-License-Identifier: MIT
pragma solidity >=0.7.5;

interface IStrategy {

    function deploy(address _token) external;
    
    function withdraw(address _token, uint _amount) external returns (uint);

    function emergencyWithdraw(address _token) external returns (uint);
    // Return the difference between amount deposited and balance
    function collectProfits(address _token) external returns (int);
    // Returns the rewards that are !_token
    function collectRewards(address _token) external;
    // Returns the amount of tokens deposited by the asset allocator
    function deposited(address _token) external view returns (uint);
    // Returns the amount of tokens in the strategy
    function balance(address _token) external view returns (uint);
}
