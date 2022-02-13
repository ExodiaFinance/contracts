// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "../TreasuryDepositor.sol";

contract TreasuryDepositorMockMachine {

    address public depositor;

    constructor(address _depositor) {
        depositor = _depositor;
    }

    function returnFunds(address _token, uint _amount) external {
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        IERC20(_token).approve(depositor, _amount);
        TreasuryDepositor(depositor).returnFunds(_token, _amount);
    }

    function returnWithProfits(address _token, uint _amount, uint _profits) external {
        IERC20(_token).transferFrom(msg.sender, address(this), _amount + _profits);
        IERC20(_token).approve(depositor, _amount + _profits);
        TreasuryDepositor(depositor).returnWithProfits(_token, _amount, _profits);
    }
    
    function returnWithLoss(address _token, uint _amount, uint _loss) external {
        IERC20(_token).transferFrom(msg.sender, address(this), _amount - _loss);
        IERC20(_token).approve(depositor, _amount - _loss);
        TreasuryDepositor(depositor).returnWithLoss(_token, _amount, _loss);
    }
    
    function deposit(address _token, uint _amount) external {
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        IERC20(_token).approve(depositor, _amount);
        TreasuryDepositor(depositor).deposit(_token, _amount);
    }
    
    function removeARFVFromTreasury(address _token, uint _amount) external {
        TreasuryDepositor(depositor).removeARFVFromTreasury(_token, _amount);
    }
}
