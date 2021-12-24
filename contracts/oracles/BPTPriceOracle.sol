// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@uniswap/v2-core/contracts/interfaces/IERC20.sol";

import "../interfaces/IUniswapV2Router.sol";
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

contract BPTPriceOracle is SpotPriceOracle {

    using SafeMath for uint;
    
    IERC20 immutable denominator;
    address vault;
    bytes32 poolId;
    uint8 index;
    uint8 weight;
    
    constructor(address _denominator) SpotPriceOracle(){
        denominator = IERC20(_denominator);
    }
    
    function setup(address _vault, bytes32 _poolId, uint8 _index, uint8 _weight) public onlyPolicy {
        require(weight < 100, "Weight can't be more than 100");
        (IERC20[] memory tokens,,) = IVault(_vault).getPoolTokens(_poolId);
        require(tokens[_index] == denominator, "Index is not the denominator");
        vault = _vault;
        poolId = _poolId;
        index = _index;
        weight = _weight;
    }

    function getPrice() public view override returns (int256){
        (IERC20[] memory tokens, uint[] memory balances,) = IVault(vault).getPoolTokens(poolId);
        uint totalValue = balances[index].mul(100).div(weight);
        (address poolAddress, uint8 spec) = IVault(vault).getPool(poolId);
        IERC20 bpt = IERC20(poolAddress);
        totalValue = totalValue.mul(10**bpt.decimals()).div(10**denominator.decimals());
        return int256(totalValue.mul(1e8).div(bpt.totalSupply()));
    }
    

}
