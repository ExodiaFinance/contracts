// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockStrategy {

    address allocator;
    
    constructor(address _allocator){
        allocator = _allocator;
    }
    
    function deploy(address _token) external {}

    function withdraw(address _token, uint _amount) external {
        IERC20(_token).transfer(allocator,_amount);
    }

    function collectRewards(address _token) external {}

    function deposited(address _token) public view returns (uint) {
        return IERC20(_token).balanceOf(address(this));
    }
}
