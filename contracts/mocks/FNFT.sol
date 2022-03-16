// SPDX-License-Identifier: MIT
pragma solidity >=0.7.5;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "../interfaces/revest/IFNFTHandler.sol";

interface IPolicy is IERC1155, IFNFTHandler {}
