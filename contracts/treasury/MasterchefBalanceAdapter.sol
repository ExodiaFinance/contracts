// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../Policy.sol";
import "./TreasuryTracker.sol";

interface IMasterchef {
    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt; 

    }
    function userInfo(uint _pid, address _farmer) external view returns(UserInfo memory);

}

contract MasterchefBalanceAdapter is Policy, IBalanceAdapter {
    
    struct Farm {
        address contractAddress;
        uint pid;
    }

    mapping(address => Farm[]) public farmsForToken;

    
    function addFarm(address _token, Farm calldata _farm) external onlyPolicy {
        farmsForToken[_token].push(_farm);
    }

    function balance(address _holder, address _token) external view override returns(uint) {
        Farm[] memory farms = farmsForToken[_token];
        uint total = 0;
        for(uint i = 0; i < farms.length; i++){
            total += _balance(farms[i].contractAddress, _holder, farms[i].pid);
        }
        return total;
    }
    
    function _balance(address _masterchef, address _holder, uint _pid) internal view returns (uint256){
        return IMasterchef(_masterchef).userInfo(_pid, _holder).amount;
    }
}
