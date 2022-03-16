// SPDX-License-Identifier: GNU-GPL v3.0 or later

pragma solidity >=0.8.0;

import "./IRevest.sol";

interface ITokenVault {
    function createFNFT(
        uint256 fnftId,
        IRevest.FNFTConfig memory fnftConfig,
        uint256 quantity,
        address from
    ) external;

    function withdrawToken(
        uint256 fnftId,
        uint256 quantity,
        address user
    ) external;

    function depositToken(
        uint256 fnftId,
        uint256 amount,
        uint256 quantity
    ) external;

    function cloneFNFTConfig(IRevest.FNFTConfig memory old)
        external
        returns (IRevest.FNFTConfig memory);

    function mapFNFTToToken(uint256 fnftId, IRevest.FNFTConfig memory fnftConfig)
        external;

    function handleMultipleDeposits(
        uint256 fnftId,
        uint256 newFNFTId,
        uint256 amount
    ) external;

    function splitFNFT(
        uint256 fnftId,
        uint256[] memory newFNFTIds,
        uint256[] memory proportions,
        uint256 quantity
    ) external;

    function getFNFT(uint256 fnftId) external view returns (IRevest.FNFTConfig memory);

    function getFNFTCurrentValue(uint256 fnftId) external view returns (uint256);

    function getNontransferable(uint256 fnftId) external view returns (bool);

    function getSplitsRemaining(uint256 fnftId) external view returns (uint256);
}
