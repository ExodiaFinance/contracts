// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "../TreasuryManager.sol";

contract TreasuryManagerMockMachine  {

    address public treasuryManager;

    constructor(address _treasuryManager) {
        treasuryManager = _treasuryManager;
    }

    function manage(address _token, uint _amount) external {
        TreasuryManager(treasuryManager).manage(_token, _amount);
    }
    
    function withdraw(address _token, uint _amount) external {
        TreasuryManager(treasuryManager).withdraw(_token, _amount);
    }
}
