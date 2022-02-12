// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "./ExodiaRoles.sol";

/**
 * The ExodiaAccessControl let's contract implement role based 
 * permission using the ExodiaRoles contract.
 * It adds the Machine role on a per contract basis.
 * The Machine role is intended to be used if the contract can only be called from another
 * contract or by a keeper we know the address.
 */
abstract contract ExodiaAccessControl {
    
    ExodiaRoles public roles;
    mapping(address => bool) machines;
    
    constructor(address _roles){
        roles = ExodiaRoles(_roles);
    }
    
    function setRoles(address _roles) external onlyArchitect {
        roles = ExodiaRoles(_roles);
    }
    
    function getRoles() external view returns(address) {
        return address(roles);
    }
    
    function _getRoles() internal view returns (ExodiaRoles){
        return roles;
    }
    
    function addMachine(address _address) external onlyArchitect{
        machines[_address] = true;
    }
    
    function removeMachine(address _address) external onlyArchitect{
        machines[_address] = false;
    }
    
    function isMachine(address _address) external view returns (bool){
        return machines[_address];
    }
    
    modifier onlyMachine(){
        require(machines[msg.sender], "caller is not a machine");
        _;
    }

    function isStrategist(address _address) external view returns (bool){
        return roles.isStrategist(msg.sender);
    }
    
    modifier onlyStrategist() {
        require(roles.isStrategist(msg.sender), "caller is not a strategist");
        _;
    }
    
    function isPolicy(address _address) external view returns(bool) {
        return roles.isPolicy(_address);
    }
    
    modifier onlyPolicy(){
        require(roles.isPolicy(msg.sender), "caller is not policy");
        _;
    }

    function isArchitect(address _address) external view returns (bool){
        return roles.isArchitect(_address);
    }
    
    modifier onlyArchitect(){
        require(roles.isArchitect(msg.sender), "caller is not an architect");
        _;
    }
    
}
