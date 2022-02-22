// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../MasterChefStrategy.sol";

contract BeethovenXFarming is MasterChefStrategy {
    
    constructor(
        address _masterChef, 
        address _rewardToken, 
        address _allocator,
        address _roles
    ) MasterChefStrategy(_masterChef, _rewardToken, _allocator, _roles){}
    
}
