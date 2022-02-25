// SPDX-License-Identifier: MIT
pragma solidity >=0.7.5;

interface IStrategy {

    function deploy(address _token) external;
    
    function withdrawTo(address _token, uint _amount, address _to) external returns (uint);

    function emergencyWithdrawTo(address _token, address _to) external returns (uint);
    // Return the difference between amount deposited and balance
    function collectProfits(address _token, address _to) external returns (int);
    // Returns the rewards that are !_token
    function collectRewards(address _token, address _to) external;
    // Returns the amount of tokens deposited by the asset allocator
    function deposited(address _token) external view returns (uint);
    // Returns the amount of tokens in the strategy
    function balance(address _token) external view returns (uint);
}
