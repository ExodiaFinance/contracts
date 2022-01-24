// SPDX-License-Identifier: MIT
pragma solidity >=0.7.5;

interface IStrategy {

    function deploy(address _token) external;
    
    function withdraw(address _token, uint _amount) external;
    
    function collectRewards(address _token) external;
    
    // Returns the amount of tokens in the strategy
    function deposited(address _token) external view returns (uint);
}
