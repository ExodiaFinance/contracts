// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

import { IERC20, SafeMath, wOHM } from "../wOHM.sol";
import "./BeethovenVaultBase.sol";

contract OlympusZap {
  using SafeMath for uint256;
  enum SwapDirection {
    FROM_OHM,
    TO_OHM
  }

  address public constant OHM = 0x3b57f3FeAaF1e8254ec680275Ee6E7727C7413c7;
  address public constant wsOHM = 0xe992C5Abddb05d86095B18a158251834D616f0D1;
  address public constant BEETHOVEN_VAULT = 0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce;

  function swap(
    SingleSwap memory singleSwap,
    FundManagement memory funds,
    uint256 limit,
    uint256 deadline
  ) external payable {
    uint256 inputAmount = singleSwap.amount;
    SwapDirection direction = singleSwap.assetIn == OHM || singleSwap.assetIn == wsOHM ? SwapDirection.FROM_OHM : SwapDirection.TO_OHM;
    // Needs pre-approval from msg.sender
    IERC20(singleSwap.assetIn).transferFrom(msg.sender, address(this), inputAmount);
    if (direction == SwapDirection.FROM_OHM) {
      /*
       * Split EXOD into wsEXOD by half amount
       * `singleSwap.assetIn` is EXOD
      */
      uint256 convertedAmount;
      if (singleSwap.assetIn == OHM) {
        IERC20(singleSwap.assetIn).approve(wsOHM, inputAmount.div(2));
        convertedAmount = wOHM(wsOHM).wrapFromOHM(inputAmount.div(2));
      } else if (singleSwap.assetIn == wsOHM) {
        convertedAmount = wOHM(wsOHM).unwrapToOHM(inputAmount.div(2));
      }
      /* Swap from EXOD */
      SingleSwap memory singleSwap1 = singleSwap;
      singleSwap1.assetIn = OHM;
      if (singleSwap.assetIn == OHM) {
        singleSwap1.amount = inputAmount.div(2);
      } else if (singleSwap.assetIn == wsOHM) {
        singleSwap1.amount = convertedAmount;
      }
      IBeethovenVault(BEETHOVEN_VAULT).swap(singleSwap1, funds, limit.div(2), deadline);
      /* Swap from wsEXOD */
      SingleSwap memory singleSwap2 = singleSwap;
      singleSwap2.assetIn = wsOHM;
      if (singleSwap.assetIn == OHM) {
        singleSwap2.amount = convertedAmount;
      } else if (singleSwap.assetIn == wsOHM) {
        singleSwap2.amount = inputAmount.div(2);
      }
      // WARNING: adjust `limit` with more generous value
      IBeethovenVault(BEETHOVEN_VAULT).swap(singleSwap2, funds, limit.div(2), deadline);
    } else if (direction == SwapDirection.TO_OHM) {
      /*
       * Split input amount into equal EXOD/wsEXOD tokens
       * `singleSwap.assetIn` is any ERC20 token, i.e DAI
      */
      /* Swap to EXOD */
      SingleSwap memory singleSwap1 = singleSwap;
      singleSwap1.assetOut = OHM;
      singleSwap1.amount = inputAmount.div(2);
      IBeethovenVault(BEETHOVEN_VAULT).swap(singleSwap1, funds, limit.div(2), deadline);
      /* Swap to wsEXOD */
      SingleSwap memory singleSwap2 = singleSwap;
      singleSwap2.assetOut = wsOHM;
      singleSwap2.amount = inputAmount.div(2);
      IBeethovenVault(BEETHOVEN_VAULT).swap(singleSwap2, funds, limit.div(2), deadline);
    }
  }

  function batchSwap(
    SwapKind kind,
    BatchSwapStep[] memory swaps1,
    IAsset[] memory assets1,
    int256[] memory limits1,
    BatchSwapStep[] memory swaps2,
    IAsset[] memory assets2,
    int256[] memory limits2,
    FundManagement memory funds,
    uint256 deadline
  ) external payable {
    uint256 inputAssetIndex = swaps1[0].assetInIndex;
    SwapDirection direction = assets1[inputAssetIndex] == OHM || assets1[inputAssetIndex] == wsOHM ? SwapDirection.FROM_OHM : SwapDirection.TO_OHM;
    IERC20(assets1[inputAssetIndex]).transferFrom(msg.sender, address(this), swaps1[0].amount);
    if (direction == SwapDirection.FROM_OHM) {
      IBeethovenVault(BEETHOVEN_VAULT).batchSwap(kind, swaps1, assets1, funds, limits1, deadline);
      IBeethovenVault(BEETHOVEN_VAULT).batchSwap(kind, swaps2, assets2, funds, limits2, deadline);
    }
  }
}