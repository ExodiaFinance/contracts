// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "./ExodiaAccessControlInitializable.sol";

/**
 * The ExodiaAccessControl let's contract implement role based
 * permission using the ExodiaRoles contract.
 * It adds the Machine role on a per contract basis.
 * The Machine role is intended to be used if the contract can only be called from another
 * contract or by a keeper we know the address.
 */
abstract contract ExodiaAccessControl is ExodiaAccessControlInitializable {
    constructor(address _roles) {
        __ExodiaAccessControl__init(_roles);
    }
}
