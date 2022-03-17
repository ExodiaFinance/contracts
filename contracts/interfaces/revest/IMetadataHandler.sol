// SPDX-License-Identifier: GNU-GPL v3.0 or later

pragma solidity ^0.8.0;

interface IMetadataHandler {
    function getTokenURI(uint256 fnftId) external view returns (string memory);

    function setTokenURI(uint256 fnftId, string memory _uri) external;

    function getRenderTokenURI(uint256 tokenId, address owner)
        external
        view
        returns (string memory baseRenderURI, string[] memory parameters);

    function setRenderTokenURI(uint256 tokenID, string memory baseRenderURI) external;
}
