// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@uniswap/v2-core/contracts/interfaces/IERC20.sol";

import "./interfaces/AggregatorV3Interface.sol";
import "./SpotPriceOracle.sol";

interface IVault {
    function getPoolTokens(bytes32 poolId)
        external
        view
        returns (
            IERC20[] memory tokens,
            uint256[] memory balances,
            uint256 lastChangeBlock
        );

    function getPool(bytes32 poolId) external view returns (address, uint8);
}

interface IBeetPool {
    function getNormalizedWeights() external view returns (uint256[] memory);
}

contract BalV2SpotPriceOracle is SpotPriceOracle {
    using SafeMath for uint256;

    address vault;
    bytes32 poolId;
    uint8 tokenIndex;
    address poolAddress;
    uint8[] indexes;
    address[] oracles;
    uint256[] weights;

    constructor() SpotPriceOracle() {}

    function setup(
        address _vault,
        bytes32 _poolId,
        uint8 _tokenIndex,
        uint8[] calldata _indexes,
        address[] calldata _oracles
    ) external onlyPolicy {
        require(_indexes.length <= 8, "Can't have more than 8 tokens");
        vault = _vault;
        poolId = _poolId;
        tokenIndex = _tokenIndex;
        indexes = _indexes;
        oracles = _oracles;
        (address _poolAddress, uint8 spec) = IVault(vault).getPool(poolId);
        poolAddress = _poolAddress;
        weights = IBeetPool(poolAddress).getNormalizedWeights();
    }

    function getPrice() public view override returns (int256) {
        (IERC20[] memory tokens, uint256[] memory balances, ) = IVault(vault)
            .getPoolTokens(poolId);
        uint256 weight = 0;
        uint256 value = 0;
        for (uint8 i = 0; i < indexes.length; i++) {
            uint8 index = indexes[i];
            IERC20 token = tokens[index];
            int256 tokenPrice = AggregatorV3Interface(oracles[i]).latestAnswer();
            uint256 tokenValue = uint256(tokenPrice) * balances[index];
            tokenValue = tokenValue.div(10**token.decimals());
            value = value + tokenValue;
            weight = weight + weights[index];
        }
        uint256 tokenValue = value.mul(weights[tokenIndex]).div(weight);
        uint256 tokenPrice = tokenValue.mul(10**tokens[tokenIndex].decimals()).div(
            balances[tokenIndex]
        );
        return int256(tokenPrice);
    }
}
