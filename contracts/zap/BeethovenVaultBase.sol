// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

enum SwapKind {
  GIVEN_IN,
  GIVEN_OUT
}
interface IAsset {}
struct SingleSwap {
  bytes32 poolId;
  SwapKind kind;
  address assetIn;
  address assetOut;
  uint256 amount;
  bytes userData;
}
struct BatchSwapStep {
  bytes32 poolId;
  uint256 assetInIndex;
  uint256 assetOutIndex;
  uint256 amount;
  bytes userData;
}
struct FundManagement {
  address sender;
  bool fromInternalBalance;
  address payable recipient;
  bool toInternalBalance;
}

interface IBeethovenVault {
  function swap(
    SingleSwap memory singleSwap,
    FundManagement memory funds,
    uint256 limit,
    uint256 deadline
  ) external payable returns (uint256);

  function batchSwap(
    SwapKind kind,
    BatchSwapStep[] memory swaps,
    IAsset[] memory assets,
    FundManagement memory funds,
    int256[] memory limits,
    uint256 deadline
  ) external payable returns (int256[]);
}
