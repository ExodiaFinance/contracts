// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "../../mocks/MockERC20.sol";

import "hardhat/console.sol";

contract MockAssetAllocator {
    
    mapping(address => int) tokenSlip;
    
    function rebalance(address _token, uint _amount) external returns (uint) {
        _slippage(_token);
        uint balance = allocatedBalance(_token);
        if(balance > _amount){
            IERC20(_token).transfer(msg.sender, balance - _amount);
        } else if (balance < _amount) {
            IERC20(_token).transferFrom(msg.sender, address(this), _amount - balance);
        }
        return allocatedBalance(_token);
    }
    
    function _slippage(address _token) internal {
        int slippage = tokenSlip[_token];
        if(slippage > 0){
            //console.log("Slipping: ", uint(slippage));
            loose(_token, uint(slippage));
        } else {
            //console.log("Slipping: -", uint(slippage*-1));
            profits(_token, uint(slippage * -1));
        }
    }
    
    function allocatedBalance(address _token) public returns (uint){
        return IERC20(_token).balanceOf(address(this));
    }
    
    function profits(address _token, uint _amount) public {
        MockToken(_token).mint(address(this), _amount);
    }
    
    function loose(address _token, uint _amount) public {
        MockToken(_token).burn(address(this), _amount);
    }
    
    function slip(address _token, int _amount) external {
        tokenSlip[_token] = _amount;
    }

    function collectRewards(address _token) external {
        
    }
}
