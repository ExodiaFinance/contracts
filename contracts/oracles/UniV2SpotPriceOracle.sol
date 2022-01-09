// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "../interfaces/IUniswapV2Router.sol";
import "./SpotPriceOracle.sol";


contract UniV2SpotPriceOracle is SpotPriceOracle{

    using SafeMath for uint;
    
    address router;
    address[] path;
    address immutable token0;
    address immutable token1;

    constructor(address _token0, address _token1) SpotPriceOracle(){
        token0 = _token0;
        token1 = _token1;
    }

    function updatePath(address _router, address[] calldata _path) external onlyPolicy {
        require(_path[0] == token0, "wrong input");
        require(_path[_path.length-1] == token1, "wrong output");
        path = _path;
        router = _router;
    }
    
    function getPrice() public view override returns (int256){
        uint[] memory amountsOut = IUniswapV2Router(router).getAmountsOut(1e18, path);
        uint price = amountsOut[amountsOut.length - 1];
        price = price.mul(100);
        // returned price is 6 decimals, but chain link oracle returns 8 decimals
        return int256(price);
    }
}
