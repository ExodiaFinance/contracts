// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

import "../../Policy.sol";
import "../../librairies/IBeethovenWeightedPoolFactory.sol";

contract BalancerPoolCreator is Policy {
    address public immutable factoryAddress;
    
    constructor(address _poolFactory){
        factoryAddress = _poolFactory;
    }
    
    function initialize(
            string memory name,
            string memory symbol,
            uint256 fee,
            IERC20[] memory tokens, 
            uint256[] memory weights,
            uint256[] memory amounts
    ) public onlyPolicy returns(address){
        address pool = IBeethovenWeightedPoolFactory(factoryAddress).create(
            name,
            symbol,
            tokens,
            weights, 
            fee,
            policy()
        );
        
        return pool;
    } 
}
