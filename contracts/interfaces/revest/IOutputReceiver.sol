// SPDX-License-Identifier: GNU-GPL v3.0 or later

pragma solidity >=0.8.0;

import "./IRegistryProvider.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title Provider interface for Revest FNFTs
 */
interface IOutputReceiver is IRegistryProvider, IERC165 {
    function receiveRevestOutput(
        uint256 fnftId,
        address asset,
        address payable owner,
        uint256 quantity
    ) external;

    function getCustomMetadata(uint256 fnftId) external view returns (string memory);

    function getValue(uint256 fnftId) external view returns (uint256);

    function getAsset(uint256 fnftId) external view returns (address);

    function getOutputDisplayValues(uint256 fnftId) external view returns (bytes memory);
}
