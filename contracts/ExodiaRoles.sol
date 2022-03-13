// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * ExodiaRoles is a registry for roles.
 * DAO is the all powerful default admin
 * Architect is the role in charge of deploying contracts and orchestrating automation
 * Policy is handling bonds, reward rates and other levers on the protocol
 * Strategist handles treasury operations, investment and farming
 */

contract ExodiaRoles is AccessControl {

    bytes32 public constant STRATEGIST = keccak256("strategist");
    bytes32 public constant POLICY = keccak256("policy");
    bytes32 public constant ARCHITECT = keccak256("architect");
    bytes32 public constant DAO = DEFAULT_ADMIN_ROLE;
    address public DAO_ADDRESS;
    address public nextDao;
    
    constructor(address _dao){
        DAO_ADDRESS = _dao;
        _grantRole(DAO, _dao);
    }
    
    //TODO: Add tests pushDAO/pullDAO
    function pushDAO(address _newDao) external {
        require(isDAO(msg.sender), "Not DAO");
        nextDao = _newDao;
    }
    
    function isDAO(address _address) public view returns(bool) {
        return hasRole(DAO, _address);
    }
    
    function pullDAO() external {
        require(msg.sender == nextDao, "not next DAO");
        _grantRole(DAO, nextDao);
        _revokeRole(DAO, DAO_ADDRESS);
        DAO_ADDRESS = nextDao;
    }
    
    function addPolicy(address _address) external {
        grantRole(POLICY, _address);
    }

    function removePolicy(address _address) external {
        revokeRole(POLICY, _address);
    }

    function isPolicy(address _address) external view returns (bool){
        return hasRole(POLICY, _address);
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
