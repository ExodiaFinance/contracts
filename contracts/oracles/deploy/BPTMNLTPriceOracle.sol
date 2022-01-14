// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../BPTPriceOracleV2.sol";

contract BPTMNLTPriceOracle is BPTPriceOracleV2 {
    constructor() SpotPriceOracle(){
    }
}
