// SPDX-License-Identifier: GNU-GPL v3.0 or later

pragma solidity >=0.8.0;

interface IFNFTHandler {
    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external;

    function mintBatchRec(
        address[] memory recipients,
        uint256[] memory quantities,
        uint256 id,
        uint256 newSupply,
        bytes memory data
    ) external;

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external;

    function setURI(string memory newuri) external;

    function burn(
        address account,
        uint256 id,
        uint256 amount
    ) external;

    function burnBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external;

    function getBalance(address tokenHolder, uint256 id) external view returns (uint256);

    function getSupply(uint256 fnftId) external view returns (uint256);

    function getNextId() external view returns (uint256);
}
