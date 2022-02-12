// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/access/AccessControl.sol";


contract ExodiaRoles is AccessControl {

    bytes32 public constant STRATEGIST = keccak256("strategist");
    bytes32 public constant MACHINE = keccak256("machine");
    bytes32 public constant ARCHITECT = keccak256("architect");
    bytes32 public constant DAO = DEFAULT_ADMIN_ROLE;
    
    constructor(address _dao){
        _grantRole(DAO, _dao);
    }

    
    
    function addMachine(address _address) external {
        grantRole(MACHINE, _address);
    }

    function removeMachine(address _address) external {
        revokeRole(MACHINE, _address);
    }

    function isMachine(address _address) external view returns (bool){
        return hasRole(MACHINE, _address);
    }
    
    function addStrategist(address _address) external {
        grantRole(STRATEGIST, _address);
    }

    function removeStrategist(address _address) external {
        revokeRole(STRATEGIST, _address);
    }
    
    function isStrategist(address _address) external view returns(bool){
        return hasRole(STRATEGIST, _address);
    }
    
    function addArchitect(address _address) external {
        grantRole(ARCHITECT, _address);
    }
    
    function removeArchitect(address _address) external {
        revokeRole(ARCHITECT, _address);
    }
    
    function isArchitect(address _address) external view returns(bool) {
        return hasRole(ARCHITECT, _address);
    }
}
