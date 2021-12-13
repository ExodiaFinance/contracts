// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

import "../../Policy.sol";


contract BalancerLiquidityAllocationStrategy is Policy {
    address public immutable treasury;
    address public pool;
    
    constructor(address _treasury){
        treasury = _treasury;
    }
    
    
    
}
