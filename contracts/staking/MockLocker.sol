// SPDX-License-Identifier: GNU-GPL v3.0 or later

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import "../interfaces/revest/IOutputReceiver.sol";
import "../interfaces/revest/IRevest.sol";
import "../interfaces/revest/IAddressRegistry.sol";
import "../interfaces/revest/IRewardsHandler.sol";
import "../interfaces/revest/IFNFTHandler.sol";
import "../interfaces/revest/IAddressLock.sol";

import "../Policy.sol";
import "./ILocker.sol";

import "hardhat/console.sol";

contract MockLocker is Policy, IOutputReceiver, IAddressLock, ILocker {
    using SafeERC20 for IERC20;

    address private REWARD_TOKEN;
    address public rewardsHandlerAddress;
    address public revestRegistryAddress;

    uint256 private constant ONE_DAY = 86400;

    // Default values
    uint256[] public interestRates = [4, 13, 27, 56];
    uint256[] public lockupPeriods = [30 days, 90 days, 180 days, 360 days];
    uint256[] public withdrawalWindows = [1 days, 5 days, 9 days, 14 days];
    uint256 private constant MAX_INT = 2**256 - 1;

    string public customMetadataUrl =
        "https://revest.mypinata.cloud/ipfs/QmeSaVihizntuDQL5BgsujK2nK6bkkwXXzHATGGjM2uyRr";
    string public addressMetadataUrl =
        "https://revest.mypinata.cloud/ipfs/QmY3KUBToJBthPLvN1Knd7Y51Zxx7FenFhXYV8tPEMVAP3";

    event StakedRevest(
        uint256 indexed timePeriod,
        uint256 indexed amount,
        uint256 fnftId
    );

    constructor(address _revestRegistry) {
        revestRegistryAddress = _revestRegistry;
    }

    function getToken() external view override returns (address) {
        return REWARD_TOKEN;
    }

    function getRewardsToken() external view override returns (address) {
        return REWARD_TOKEN;
    }

    function lock(uint256 amount, uint8 periodId)
        external
        payable
        override
        returns (uint256)
    {
        return 1;
    }

    function addToLock(uint256 fnftId, uint256 amount) public {}

    function unlock(uint256 fnftId, uint256 quantity) external override returns (bool) {
        return true;
    }

    function getLockupPeriod(uint256 periodId) public view returns (uint256) {
        return lockupPeriods[periodId];
    }

    function getWindow(uint256 periodId) public view returns (uint256) {
        return withdrawalWindows[periodId];
    }

    function getInterestRate(uint256 periodId) public view returns (uint256 interest) {
        return interestRates[periodId];
    }

    function receiveRevestOutput(
        uint256 fnftId,
        address asset,
        address payable owner,
        uint256 quantity
    ) external override {}

    function claimRewards(uint256 fnftId) external {}

    function updateLock(
        uint256 fnftId,
        uint256,
        bytes memory
    ) external override {}

    function getOutputDisplayValues(uint256 fnftId)
        external
        view
        override
        returns (bytes memory)
    {
        return abi.encode(0);
    }

    function setAddressRegistry(address addressRegistry_) external override onlyPolicy {
        revestRegistryAddress = addressRegistry_;
    }

    function getAddressRegistry() external view override returns (address) {
        return revestRegistryAddress;
    }

    function getRevest() private view returns (IRevest) {
        return IRevest(getRegistry().getRevest());
    }

    function getRegistry() public view returns (IAddressRegistry) {
        return IAddressRegistry(revestRegistryAddress);
    }

    function getValue(uint256 fnftId) external view override returns (uint256) {
        return 0;
    }

    function getAsset(uint256 fnftId) external view override returns (address) {
        return REWARD_TOKEN;
    }

    function setRewardsHandler(address _handler) external onlyPolicy {
        rewardsHandlerAddress = _handler;
    }

    function getDisplayValues(uint256 fnftId, uint256)
        external
        view
        override
        returns (bytes memory)
    {
        return abi.encode(100, 0);
    }

    function isUnlockable(uint256 fnftId, uint256) external view override returns (bool) {
        return false;
    }

    function createLock(
        uint256 fnftId,
        uint256 lockId,
        bytes memory arguments
    ) external override {
        return;
    }

    function setCustomMetadata(string memory _customMetadataUrl) external onlyPolicy {
        customMetadataUrl = _customMetadataUrl;
    }

    function getCustomMetadata(uint256 fnftId)
        external
        view
        override
        returns (string memory)
    {
        return customMetadataUrl;
    }

    function setMetadata(string memory _addressMetadataUrl) external onlyPolicy {
        addressMetadataUrl = _addressMetadataUrl;
    }

    function getMetadata() external view override returns (string memory) {
        return addressMetadataUrl;
    }

    function needsUpdate() external pure override returns (bool) {
        return true;
    }

    // Admin functions

    function manualMapConfig(
        uint256[] memory fnftIds,
        uint256[] memory timePeriod,
        uint256[] memory lockedFrom
    ) external onlyPolicy {}

    function updateInterestRates(uint256[4] memory newRates) external onlyPolicy {
        interestRates = newRates;
    }

    function _msgSender() internal view returns (address) {
        return msg.sender;
    }

    // IERC165 interface function

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return (interfaceId == type(IOutputReceiver).interfaceId ||
            interfaceId == type(IAddressLock).interfaceId);
    }
}
