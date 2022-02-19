// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

interface IChainlinkRegistry {
    struct ChainlinkFeed {
        string symbol;
        address asset;
        address feed;
    }

    function add(
        address feed,
        address asset,
        string memory symbol,
        bool lookupSymbol
    ) external;

    function count() external view returns (uint256);

    function initialize() external;

    function getFeed(uint256 index) external view returns (ChainlinkFeed memory);

    function getFeed(string memory symbol) external view returns (ChainlinkFeed memory);

    function getFeed(address asset) external view returns (ChainlinkFeed memory);

    function getPrice(uint256 index)
        external
        view
        returns (uint256 price, uint8 decimals);

    function getPrice(address asset)
        external
        view
        returns (uint256 price, uint8 decimals);

    function getPrice(string memory symbol)
        external
        view
        returns (uint256 price, uint8 decimals);

    function remove(address feed) external;

    function VERSION() external view returns (uint256);
}
