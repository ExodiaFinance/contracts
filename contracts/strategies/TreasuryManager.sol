// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../interfaces/IOlympusTreasury.sol";
import "../ExodiaAccessControl.sol";
import "./IAllocatedRiskFreeValue.sol";

import "hardhat/console.sol";

contract TreasuryManager is ExodiaAccessControl {

    address public treasuryAddress;
    address public arfvAddress;
    
    constructor(address _treasury, address _arfv, address _roles) ExodiaAccessControl(_roles) {
        treasuryAddress = _treasury;
        arfvAddress = _arfv;
    }
    
    function manage(address _token, uint _amount) external onlyMachine onlyContract {
        IOlympusTreasury treasury = _getTreasury();
        IAllocatedRiskFreeValue arfv = _getARFVToken();
        uint valueOfAmount = treasury.valueOf(_token, _amount);
        if(valueOfAmount > 0) {
            arfv.mint(valueOfAmount);
            arfv.approve(treasuryAddress, valueOfAmount);
            treasury.deposit(valueOfAmount, arfvAddress, valueOfAmount);
        }
        treasury.manage(_token, _amount);
        IERC20(_token).transfer(msg.sender, _amount);
    }
    
    function _getTreasury() internal view returns(IOlympusTreasury){
        return IOlympusTreasury(treasuryAddress);
    }
    
    function _getARFVToken() internal view returns (IAllocatedRiskFreeValue){
        return IAllocatedRiskFreeValue(arfvAddress);
    }
    
    function withdraw(address _token, uint _amount) external onlyMachine onlyContract {
        _getTreasury().manage(_token, _amount);
        IERC20(_token).transfer(msg.sender, _amount);
    }
    
    modifier onlyContract(){
        require(Address.isContract(msg.sender), "caller is not a contract");
        _;
    }
    
}
