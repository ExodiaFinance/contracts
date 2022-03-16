// SPDX-License-Identifier: GNU-GPL v3.0 or later

pragma solidity >=0.8.0;

import "./IRevest.sol";

interface ILockManager {
    function createLock(uint256 fnftId, IRevest.LockParam memory lock)
        external
        returns (uint256);

    function getLock(uint256 lockId) external view returns (IRevest.Lock memory);

    function fnftIdToLockId(uint256 fnftId) external view returns (uint256);

    function fnftIdToLock(uint256 fnftId) external view returns (IRevest.Lock memory);

    function pointFNFTToLock(uint256 fnftId, uint256 lockId) external;

    function lockTypes(uint256 tokenId) external view returns (IRevest.LockType);

    function unlockFNFT(uint256 fnftId, address sender) external returns (bool);

    function getLockMaturity(uint256 fnftId) external view returns (bool);
}
