// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

interface wIERC20 is IERC20 {
    function sOHMValue(uint256 value) external view returns (uint256);
}

contract ExodiaBalanceAggregator is Initializable {
    IERC20 public EXOD = IERC20(address(0));
    IERC20 public sEXOD = IERC20(address(0));
    wIERC20 public wsEXOD = wIERC20(address(0));
    
    function __initialize(address _exod, address _sexod, address _wsexod) public initializer {
        EXOD = IERC20(_exod);
        sEXOD = IERC20(_sexod);
        wsEXOD = wIERC20(_wsexod);
    }

    function balanceOf(address account) public view returns (uint256 balance) {
        balance = EXOD.balanceOf(account);
        balance += sEXOD.balanceOf(account);
        balance += wsEXOD.sOHMValue(wsEXOD.balanceOf(account));
    }

    function decimals() public view returns (uint8) {
        return IERC20Metadata(address(EXOD)).decimals();
    }
}
