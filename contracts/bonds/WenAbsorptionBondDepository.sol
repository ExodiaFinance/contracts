// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "./AbsorptionBond.sol";

contract WenAbsorptionBondDepository is AbsorptionBond {
    constructor(
        address _wsexod,
        address _wen,
        address _dao
    ) AbsorptionBond(_wsexod, _wen, _dao) {}
}
