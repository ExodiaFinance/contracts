// SPDX-License-Identifier: MIT
pragma solidity >=0.7.5;

interface IUniswapV2Factory {
    function getPair(address _tokenA, address _tokenB) external view returns (address);

    function allPairsLength() external view returns (uint256);

    function pairCodeHash() external pure returns (bytes32);

    function createPair(address tokenA, address tokenB) external returns (address pair);

    function setFeeTo(address _feeTo) external;

    function setFeeToSetter(address _feeToSetter) external;
}
