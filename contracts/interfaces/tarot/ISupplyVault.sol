// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IBorrowable.sol";
import "./ISupplyVaultStrategy.sol";

interface ISupplyVault {
    /* Vault */
    function enter(uint256 amount) external returns (uint256 share);

    function enterWithToken(address tokenAddress, uint256 tokenAmount)
        external
        returns (uint256 share);

    function leave(uint256 share) external returns (uint256 underlyingAmount);

    function leaveInKind(uint256 share) external;

    function applyFee() external;

    /** Read */

    function getBorrowablesLength() external view returns (uint256);

    function getBorrowableEnabled(IBorrowable borrowable) external view returns (bool);

    function getBorrowableExists(IBorrowable borrowable) external view returns (bool);

    function indexOfBorrowable(IBorrowable borrowable) external view returns (uint256);

    function borrowables(uint256) external view returns (IBorrowable);

    function underlying() external view returns (IERC20);

    function strategy() external view returns (ISupplyVaultStrategy);

    function pendingStrategy() external view returns (ISupplyVaultStrategy);

    function pendingStrategyNotBefore() external view returns (uint256);

    function feeBps() external view returns (uint256);

    function feeTo() external view returns (address);

    function reallocateManager() external view returns (address);

    /* Read functions that are non-view due to updating exchange rates */
    function underlyingBalanceForAccount(address account)
        external
        returns (uint256 underlyingBalance);

    function shareValuedAsUnderlying(uint256 share)
        external
        returns (uint256 underlyingAmount);

    function underlyingValuedAsShare(uint256 underlyingAmount)
        external
        returns (uint256 share);

    function getTotalUnderlying() external returns (uint256 totalUnderlying);

    function getSupplyRate() external returns (uint256 supplyRate);

    /* Only from strategy */

    function allocateIntoBorrowable(IBorrowable borrowable, uint256 underlyingAmount)
        external;

    function deallocateFromBorrowable(IBorrowable borrowable, uint256 borrowableAmount)
        external;

    function reallocate(uint256 share, bytes calldata data) external;

    /* Only owner */
    function addBorrowable(address user) external;

    function addBorrowables(address[] calldata addressList) external;

    function removeBorrowable(IBorrowable borrowable) external;

    function disableBorrowable(IBorrowable borrowable) external;

    function enableBorrowable(IBorrowable borrowable) external;

    function unwindBorrowable(IBorrowable borrowable, uint256 borowableAmount) external;

    function updatePendingStrategy(
        ISupplyVaultStrategy newPendingStrategy,
        uint256 notBefore
    ) external;

    function updateStrategy() external;

    function updateFeeBps(uint256 newFeeBps) external;

    function updateFeeTo(address newFeeTo) external;

    function updateReallocateManager(address newReallocateManager) external;

    function pause() external;

    function unpause() external;

    /* Voting */
    function delegates(address delegator) external view returns (address);

    function delegate(address delegatee) external;

    function delegateBySig(
        address delegatee,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function getCurrentVotes(address account) external view returns (uint256);

    function getPriorVotes(address account, uint256 blockNumber)
        external
        view
        returns (uint256);
}
