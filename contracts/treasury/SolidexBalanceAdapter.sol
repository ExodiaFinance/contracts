// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "./TreasuryTracker.sol";

interface LpDepositor {
    function userBalances(address _staker, address _token) external view returns (uint);

}

contract SolidexBalanceAdapter is IBalanceAdapter {
    
    LpDepositor immutable lpDepositor;
    
    constructor(address _lpDepositor) {
        lpDepositor = LpDepositor(_lpDepositor);
    }
    
    function balance(address _holder, address _token) external view override returns(uint) {
        return lpDepositor.userBalances(_holder, _token);
    }
}
