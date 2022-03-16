// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

import "./OlympusBondDepository.sol";

contract DAIBondDepository is OlympusBondDepository {
    constructor(
        address _OHM,
        address _principle,
        address _treasury,
        address _DAO,
        address _bondCalculator
    ) OlympusBondDepository(_OHM, _principle, _treasury, _DAO, _bondCalculator) {}
}
