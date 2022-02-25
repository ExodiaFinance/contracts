// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface ILocker {
    
    function getToken() external view returns(address);
    
    function getRewardsToken() external view returns(address);
    
    function lock(uint amount, uint8 period) external payable returns(uint);
    
    function unlock(uint fnftId, uint quantity) external returns(bool);
}
