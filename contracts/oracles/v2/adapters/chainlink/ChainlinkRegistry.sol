// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../../../../librairies/Initializable.sol";
import "./IChainlinkRegistry.sol";

contract ChainlinkRegistry is IChainlinkRegistry, Initializable, Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;

    uint256 public constant VERSION = 2022021401;

    ChainlinkFeed[] private chainlinkFeeds;
    mapping(string => uint256) private feedBySymbol;
    mapping(address => uint256) private feedByAsset;
    mapping(address => uint256) private feedByFeed;
    EnumerableSet.AddressSet private feeds;

    event AddFeed(string indexed symbol, address indexed asset, address indexed feed);
    event RemoveFeed(string indexed symbol, address indexed assset, address indexed feed);

    function initialize() public initializer {
        _transferOwnership(_msgSender());
    }

    function add(
        address feed,
        address asset,
        string memory symbol,
        bool lookupSymbol
    ) public onlyOwner whenInitialized{
        require(!feeds.contains(feed), "ChainlinkRegistry: feed already exists");
        require(
            AggregatorV3Interface(feed).version() != 0 &&
                AggregatorV3Interface(feed).decimals() != 0,
            "AggregatorV3Interface: feed does not appear to be a chainlink feed"
        );
        if (asset != address(0)) {
            if (lookupSymbol) {
                symbol = IERC20Metadata(asset).symbol();
            }

            require(
                feedBySymbol[symbol] == 0,
                "ChainlinkRegistry: feed already exists for symbol"
            );

            require(
                feedByAsset[asset] == 0,
                "ChainlinkRegistry: feed already exists for asset"
            );
            require(
                IERC20Metadata(asset).decimals() != 0,
                "ERC721Metadata: token does not appear to be an ERC20"
            );
        }

        uint256 index = chainlinkFeeds.length;

        chainlinkFeeds.push(ChainlinkFeed({symbol: symbol, asset: asset, feed: feed}));

        feedBySymbol[symbol] = index;
        if (asset != address(0)) {
            feedByAsset[asset] = index;
        }
        feedByFeed[feed] = index;
        feeds.add(feed);

        emit AddFeed(symbol, asset, feed);
    }

    function count() public view returns (uint256) {
        return feeds.length();
    }

    function getFeed(uint256 index) public view returns (ChainlinkFeed memory) {
        return chainlinkFeeds[index];
    }

    function getFeed(string memory symbol) public view returns (ChainlinkFeed memory) {
        ChainlinkFeed memory info = chainlinkFeeds[feedBySymbol[symbol]];

        require(
            keccak256(abi.encodePacked(info.symbol)) ==
                keccak256(abi.encodePacked(symbol)),
            "ChainlinkRegistry: cannot locate feed by symbol"
        );

        return info;
    }

    function getFeed(address asset) public view returns (ChainlinkFeed memory) {
        ChainlinkFeed memory info = chainlinkFeeds[feedByAsset[asset]];

        require(info.asset == asset, "ChainlinkRegistry: cannot locate feed by asset");

        return info;
    }

    function getPrice(uint256 index) public view returns (uint256 price, uint8 decimals) {
        ChainlinkFeed memory info = getFeed(index);

        price = _getPrice(info.feed);
        decimals = _getDecimals(info.feed);
    }

    function getPrice(address asset) public view returns (uint256 price, uint8 decimals) {
        ChainlinkFeed memory info = getFeed(asset);

        price = _getPrice(info.feed);
        decimals = _getDecimals(info.feed);
    }

    function getPrice(string memory symbol)
        public
        view
        returns (uint256 price, uint8 decimals)
    {
        ChainlinkFeed memory info = getFeed(symbol);

        price = _getPrice(info.feed);
        decimals = _getDecimals(info.feed);
    }

    function remove(address feed) public onlyOwner {
        require(feeds.contains(feed), "ChainlinkRegistry: feed does not exist");

        uint256 index = feedByFeed[feed];

        ChainlinkFeed memory info = chainlinkFeeds[index];

        delete feedBySymbol[info.symbol];
        delete feedByFeed[feed];
        delete feedByAsset[info.asset];
        feeds.remove(feed);
        delete chainlinkFeeds[index];

        emit RemoveFeed(info.symbol, info.asset, info.feed);
    }

    function _getPrice(address _feed) internal view returns (uint256 _value) {
        (, int256 value, , , ) = AggregatorV3Interface(_feed).latestRoundData();
        return uint256(value);
    }

    function _getDecimals(address _feed) internal view returns (uint8 _decimals) {
        return AggregatorV3Interface(_feed).decimals();
    }
}
