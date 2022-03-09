// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "../ExodiaAccessControlInitializable.sol";

/**
 * The ExodiaAccessControl let's contract implement role based
 * permission using the ExodiaRoles contract.
 * It adds the Machine role on a per contract basis.
 * The Machine role is intended to be used if the contract can only be called from another
 * contract or by a keeper we know the address.
 */
contract MockExodiaAccessControl is ExodiaAccessControlInitializable {
    
    function initialize(address _roles) external initializer {
        ExodiaAccessControlInitializable.initializeAccessControl(_roles);
    }
    
    function forOnlyArchitect() external onlyArchitect {}
    
    function forOnlyPolicy() external onlyPolicy {}
    
    function forOnlyStrategist() external onlyStrategist {}
    
    function forOnlyMachine() external onlyMachine {}
}
