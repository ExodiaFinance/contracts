// SPDX-License-Identifier: MIT
pragma solidity >=0.7.5;

import "../interfaces/IERC20.sol";
import "../interfaces/IPolicy.sol";

interface IAllocatedRiskFreeValue is IERC20, IPolicy {
    function mint(uint256 _amount) external;

    function burn(uint256 _amount) external;

    function burnFrom(address _holder, uint256 _amount) external;

    function addMinter(address _minter) external;

    function removeMinter(address _minter) external;

    function isMinter(address _minter) external view returns (bool);
}
