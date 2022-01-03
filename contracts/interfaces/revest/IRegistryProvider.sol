// SPDX-License-Identifier: GNU-GPL v3.0 or later

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IAddressRegistry.sol";
import "./ILockManager.sol";
import "./ITokenVault.sol";

interface IRegistryProvider {
    function setAddressRegistry(address revest) external;

    function getAddressRegistry() external view returns (address);
}
