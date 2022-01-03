// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.7.5;

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

import "../../Policy.sol";
import "../../OlympusTreasury.sol";
import "../../interfaces/IUniswapV2Router.sol";

contract RemoveUniLp is Policy {
    address public immutable treasury;
    address public pool;

    constructor(address _treasury){
        treasury = _treasury;
    }


    function remove(address _router, address _lp) external onlyPolicy{
        withdrawLpFromTreasury(_lp);
        (address token0, uint amount0, address token1, uint amount1) = 
            withdrawLpFromPool(_router, _lp);
        depositInTreasury(token0, amount0);
        depositInTreasury(token1, amount1);
    }
    
    function withdrawLpFromTreasury(address _lp) private {
        uint lpBalance = IERC20(_lp).balanceOf(treasury);
        OlympusTreasury(treasury).manage(_lp, lpBalance);
    }
    
    function withdrawLpFromPool(address _router, address _lp) private 
        returns(address token0, uint amount0, address token1, uint amount1) 
    {
        token0 = IUniswapV2Pair(_lp).token0();
        token1 = IUniswapV2Pair(_lp).token1();
        uint lpBalance = IUniswapV2Pair(_lp).balanceOf(address(this));
        uint lpTotalSupply = IUniswapV2Pair(_lp).totalSupply();
        (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(_lp).getReserves();
        amount0 = lpBalance * reserve0 / lpTotalSupply;
        amount1 = lpBalance * reserve1 / lpTotalSupply;
        IERC20(_lp).approve(_router, lpBalance);
        IUniswapV2Router(_router).removeLiquidity(
            token0, 
            token1, 
            lpBalance,
            amount0,
            amount1,
            address(this), 
            block.timestamp+3600);
    }

    function depositInTreasury(address token, uint amount) public onlyPolicy{
        IERC20(token).approve(treasury, amount);
        if(canBeDeposited(token)){
            uint value = OlympusTreasury(treasury).valueOf(token, amount);
            OlympusTreasury(treasury).deposit(amount, token, value);
        } else {
            IERC20(token).transfer(treasury, amount);
        }
    }
    
    function canBeDeposited(address token)public view returns(bool){
        return OlympusTreasury(treasury).isReserveToken(token) || OlympusTreasury(treasury).isLiquidityToken(token);
    }
    
}
