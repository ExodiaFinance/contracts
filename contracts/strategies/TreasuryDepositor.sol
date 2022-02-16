// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../interfaces/IOlympusTreasury.sol";
import "../ExodiaAccessControl.sol";
import "./IAllocatedRiskFreeValue.sol";

import "hardhat/console.sol";

contract TreasuryDepositor is ExodiaAccessControl {

    address public treasuryAddress;
    address public arfvAddress;

    constructor(address _treasury, address _arfv, address _roles) ExodiaAccessControl(_roles) {
        treasuryAddress = _treasury;
        arfvAddress = _arfv;
    }
    /**
     * It is the machine's job to keep track of how much fund they manage and only return the amount they
     * took out using this function.
     * Profits should be returned using the returnWithProfits function.
     * Loss should be registered with removeARFVFromTreasury
    */
    function returnFunds(address _token, uint _amount) external onlyMachine onlyContract {
        _deposit(_token, _amount);
        _removeARFVFromTreasury(_token, _amount);
    }

    function returnWithProfits(address _token, uint _amount, uint _profits) external onlyMachine onlyContract {
        _deposit(_token, _amount + _profits);
        _removeARFVFromTreasury(_token, _amount);
    }
    /**
     * WARNING: This reduces excess reserve. If your machine looses too much money
     * and the loss makes the excess reserve go to 0 you won't be able to rebase
     * TODO: make sure transaction does not revert if that is the case by
     * transferring and auditing treasury
    */
    function returnWithLoss(address _token, uint _amount, uint _loss) external onlyMachine onlyContract {
        _deposit(_token, _amount - _loss);
        _removeARFVFromTreasury(_token, _amount);
    }
    
    function _getTreasury() internal view returns(IOlympusTreasury){
        return IOlympusTreasury(treasuryAddress);
    }

    function _getARFVToken() internal view returns (IAllocatedRiskFreeValue){
        return IAllocatedRiskFreeValue(arfvAddress);
    }

    function deposit(address _token, uint _amount) external onlyMachine onlyContract {
        _deposit(_token, _amount);
    }
    
    function _deposit(address _token, uint _amount) internal {
        IERC20 token = IERC20(_token);
        IOlympusTreasury treasury = _getTreasury();
        uint value = treasury.valueOf(_token, _amount);
        if(value > 0){
            token.transferFrom(msg.sender, address(this), _amount);
            token.approve(treasuryAddress, _amount);
            treasury.deposit(_amount, _token, value);
        } else {
            token.transferFrom(msg.sender, treasuryAddress, _amount);
        }
    }
    
    function removeARFVFromTreasury(address _token, uint _amount) external onlyMachine onlyContract {
        _removeARFVFromTreasury(_token, _amount);
    }
    
    function _removeARFVFromTreasury(address _token, uint _amount) internal {
        IOlympusTreasury treasury = _getTreasury();
        uint value = treasury.valueOf(_token, _amount);
        treasury.manage(arfvAddress, value);
        IAllocatedRiskFreeValue(arfvAddress).burn(value);
    }

    modifier onlyContract(){
        require(Address.isContract(msg.sender), "caller is not a contract");
        _;
    }

}
