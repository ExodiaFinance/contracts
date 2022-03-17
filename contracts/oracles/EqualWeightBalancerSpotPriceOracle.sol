// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "../interfaces/IBVaultV2.sol";
import "./SpotPriceOracle.sol";

import "hardhat/console.sol";

contract EWBalSpotPriceOracle is SpotPriceOracle {
    using SafeMath for uint256;

    address immutable token0;
    address immutable token1;
    address vault;
    bytes32 poolId;
    uint8 index0;
    uint8 index1;

    constructor(address _token0, address _token1) SpotPriceOracle() {
        token0 = _token0;
        token1 = _token1;
    }

    function updatePool(
        address _vault,
        bytes32 _poolId,
        uint8 _index0,
        uint8 _index1
    ) public onlyPolicy {
        vault = _vault;
        poolId = _poolId;
        (IERC20[] memory tokens, , ) = IBVaultV2(vault).getPoolTokens(poolId);
        require(address(tokens[_index0]) == token0, "Wrong index0");
        require(address(tokens[_index1]) == token1, "Wrong index1");
        index0 = _index0;
        index1 = _index1;
    }

    function getPrice() public view override returns (int256) {
        (, uint256[] memory balances, ) = IBVaultV2(vault).getPoolTokens(poolId);
        uint256 bal0 = balances[index0];
        uint256 bal1 = balances[index1].mul(10**IERC20(token0).decimals()).div(
            10**IERC20(token1).decimals()
        );
        uint256 ratio = bal1.mul(1e8).div(bal0);
        return int256(ratio);
    }
}
