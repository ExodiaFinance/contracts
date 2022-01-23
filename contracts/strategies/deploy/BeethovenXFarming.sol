// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../MasterChefStrategy.sol";

contract BeethovenXFarming is MasterchefStrategy {
    
    constructor(address _masterChef, address _rewardToken, address _allocator) 
        MasterchefStrategy(_masterChef, _rewardToken, _allocator){}
    
}
