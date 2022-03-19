// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../interfaces/IOlympusTreasury.sol";
import "../ExodiaAccessControl.sol";
import "./IAllocatedRiskFreeValue.sol";

import "hardhat/console.sol";
import "./PNLTracker.sol";

contract TreasuryDepositor is ExodiaAccessControl {
    address public treasuryAddress;
    address public arfvAddress;
    PNLTracker public pnlTracker;

    function initialize(
        address _treasury,
        address _arfv,
        address _pnlTracker,
        address _roles
    ) public initializer {
        treasuryAddress = _treasury;
        arfvAddress = _arfv;
        pnlTracker = PNLTracker(_pnlTracker);
        ExodiaAccessControlInitializable.initializeAccessControl(_roles);
    }

    /**
     * It is the machine's job to keep track of how much fund they manage and only return the amount they
     * took out using this function.
     * Profits should be returned using the returnWithProfits function.
     * Loss should be registered with removeARFVFromTreasury
     */
    function returnFunds(address _token, uint256 _amount)
        external
        onlyMachine
        onlyContract
    {
        _deposit(_token, _amount);
        _removeARFVFromTreasury(_token, _amount);
    }

    function returnWithProfits(
        address _token,
        uint256 _amount,
        uint256 _profits
    ) external onlyMachine onlyContract {
        _deposit(_token, _amount + _profits);
        _removeARFVFromTreasury(_token, _amount);
        pnlTracker.track(_token, int256(_profits));
    }

    /**
     * WARNING: This reduces excess reserve. If your machine looses too much money
     * and the loss makes the excess reserve go to 0 you won't be able to rebase
     */
    function returnWithLoss(
        address _token,
        uint256 _amount,
        uint256 _loss
    ) external onlyMachine onlyContract {
        _deposit(_token, _amount - _loss);
        _removeARFVFromTreasury(_token, _amount);
        pnlTracker.track(_token, int256(_loss) * -1);
    }

    function _getTreasury() internal view returns (IOlympusTreasury) {
        return IOlympusTreasury(treasuryAddress);
    }

    function _getARFVToken() internal view returns (IAllocatedRiskFreeValue) {
        return IAllocatedRiskFreeValue(arfvAddress);
    }

    function deposit(address _token, uint256 _amount) external onlyMachine onlyContract {
        _deposit(_token, _amount);
    }

    function _deposit(address _token, uint256 _amount) internal {
        IERC20 token = IERC20(_token);
        IOlympusTreasury treasury = _getTreasury();
        uint256 value = treasury.valueOf(_token, _amount);
        if (value > 0) {
            token.transferFrom(msg.sender, address(this), _amount);
            token.approve(treasuryAddress, _amount);
            treasury.deposit(_amount, _token, value);
        } else {
            token.transferFrom(msg.sender, treasuryAddress, _amount);
        }
    }

    /**
     * this function is to register a loss without returning tokens
     */
    function registerLoss(address _token, uint256 _loss)
        external
        onlyMachine
        onlyContract
    {
        _removeARFVFromTreasury(_token, _loss);
        pnlTracker.track(_token, int256(_loss) * -1);
    }

    function registerProfit(address _token, uint256 _amount)
        external
        onlyMachine
        onlyContract
        returns (uint256)
    {
        uint256 valueOfAmount = _getTreasury().valueOf(_token, _amount);
        if (valueOfAmount > 0) {
            IAllocatedRiskFreeValue arfv = _getARFVToken();
            arfv.mint(valueOfAmount);
            arfv.approve(treasuryAddress, valueOfAmount);
            _getTreasury().deposit(valueOfAmount, arfvAddress, valueOfAmount);
        }
        pnlTracker.track(_token, int256(_amount));
        return valueOfAmount;
    }

    function _removeARFVFromTreasury(address _token, uint256 _amount) internal {
        IOlympusTreasury treasury = _getTreasury();
        uint256 value = treasury.valueOf(_token, _amount);
        uint256 excessReserves = treasury.excessReserves();
        if (value > excessReserves) {
            //ohoh, DAO is failing to back every token, manual auditReserves will be needed
            treasury.manage(arfvAddress, excessReserves);
            IAllocatedRiskFreeValue(arfvAddress).burn(excessReserves);
            IAllocatedRiskFreeValue(arfvAddress).burnFrom(
                treasuryAddress,
                value - excessReserves
            );
        } else {
            treasury.manage(arfvAddress, value);
            IAllocatedRiskFreeValue(arfvAddress).burn(value);
        }
    }

    modifier onlyContract() {
        require(Address.isContract(msg.sender), "caller is not a contract");
        _;
    }

    function setPnlTracker(address _pnlTracker) external onlyArchitect {
        pnlTracker = PNLTracker(_pnlTracker);
    }
}
