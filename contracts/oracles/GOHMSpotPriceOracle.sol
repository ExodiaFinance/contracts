// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.0;

import "./UniV2SpotPriceOracle.sol";

contract GOHMSpotPriceOracle is UniV2SpotPriceOracle {
    constructor(address _gohm, address _stable)
        UniV2SpotPriceOracle(_gohm, _stable)
    {}
}
