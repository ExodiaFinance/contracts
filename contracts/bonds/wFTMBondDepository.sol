// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./wETHBondDepository.sol";

contract wFTMBondDepository is wETHOlympusBondDepository {
    constructor(
        address _OHM,
        address _principle,
        address _treasury,
        address _DAO,
        address _feed
    ) wETHOlympusBondDepository(_OHM, _principle, _treasury, _DAO, _feed) {}
}
