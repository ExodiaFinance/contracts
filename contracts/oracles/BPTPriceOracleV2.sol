// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@uniswap/v2-core/contracts/interfaces/IERC20.sol";

import "../interfaces/IUniswapV2Router.sol";
import "./interfaces/AggregatorV3Interface.sol";
import "./SpotPriceOracle.sol";

import "hardhat/console.sol";

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

contract BPTPriceOracleV2 is SpotPriceOracle {

    using SafeMath for uint;
    
    address vault;
    bytes32 poolId;
    address poolAddress;
    uint8[] indexes;
    address[] oracles;
    uint[] weights;

    constructor() SpotPriceOracle(){
    }

    function setup(
        address _vault, 
        bytes32 _poolId, 
        uint8[] calldata _indexes, 
        address[] calldata _oracles) external onlyPolicy {
        require(_indexes.length <= 8, "Can't have more than 8 tokens");
        vault = _vault;
        poolId = _poolId;
        indexes = _indexes;
        oracles = _oracles;
        (address _poolAddress, uint8 spec) = IVault(vault).getPool(poolId);
        poolAddress = _poolAddress;
        weights = IBeetPool(poolAddress).getNormalizedWeights();
    }

    function getPrice() public view override returns (int256){
        (IERC20[] memory tokens, uint[] memory balances,) = IVault(vault).getPoolTokens(poolId);
        uint weight = 0;
        uint value = 0;
        for (uint8 i = 0; i < indexes.length; i++){
            uint8 tokenIndex = indexes[i];
            IERC20 token = IERC20(tokens[tokenIndex]);
            int tokenPrice = AggregatorV3Interface(oracles[i]).latestAnswer();
            uint tokenValue = uint(tokenPrice) * balances[tokenIndex];
            tokenValue = tokenValue.div(10**token.decimals());
            value = value + tokenValue;
            weight = weight + weights[tokenIndex];
        }
        uint totalValue = value.mul(1e18).div(weight);
        IERC20 bpt = IERC20(poolAddress);
        return int256(totalValue.mul(10**bpt.decimals()).div(bpt.totalSupply()));
        
    }


}
