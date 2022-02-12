// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "./ExodiaRoles.sol";

abstract contract ExodiaAccessControl {
    
    ExodiaRoles public roles;
    
    constructor(address _roles){
        roles = ExodiaRoles(_roles);
    }
    
    function setRoles(address _roles) external onlyArchitect {
        roles = ExodiaRoles(_roles);
    }
    
    function getRoles() external view returns(address) {
        return address(roles);
    }
    
    function _getRoles() internal returns (ExodiaRoles){
        return roles;
    }
    
    function isMachine(address _address) external view returns (bool){
        return roles.isMachine(_address);
    }
    
    modifier onlyMachine(){
        require(roles.isMachine(msg.sender), "caller is not a machine");
        _;
    }

    function isStrategist(address _address) external view returns (bool){
        return roles.isStrategist(msg.sender);
    }
    
    modifier onlyStrategist() {
        require(roles.isStrategist(msg.sender), "caller is not a strategist");
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
