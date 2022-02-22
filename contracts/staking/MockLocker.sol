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

    uint private constant ONE_DAY = 86400;

    // Default values
    uint[] public interestRates = [4, 13, 27, 56];
    uint[] public lockupPeriods = [30 days, 90 days, 180 days, 360 days];
    uint[] public withdrawalWindows = [1 days, 5 days, 9 days, 14 days];
    uint private constant MAX_INT = 2**256 - 1;

    string public customMetadataUrl = "https://revest.mypinata.cloud/ipfs/QmeSaVihizntuDQL5BgsujK2nK6bkkwXXzHATGGjM2uyRr";
    string public addressMetadataUrl = "https://revest.mypinata.cloud/ipfs/QmY3KUBToJBthPLvN1Knd7Y51Zxx7FenFhXYV8tPEMVAP3";

    event StakedRevest(uint indexed timePeriod, uint indexed amount, uint fnftId);


    constructor(
        address _revestRegistry
    ) {
        revestRegistryAddress = _revestRegistry;
    }

    function getToken() external view override returns(address){
        return REWARD_TOKEN;
    }

    function getRewardsToken() external view override returns(address){
        return REWARD_TOKEN;
    }

    function lock(uint amount, uint8 periodId) external override payable returns (uint) {
        return 1;
    }

    function addToLock(uint fnftId, uint amount) public {

    }

    function unlock(uint fnftId, uint quantity) external override returns (bool){
        return true;
    }

    function getLockupPeriod(uint periodId) public view returns(uint){
        return lockupPeriods[periodId];
    }

    function getWindow(uint periodId) public view returns (uint) {
        return withdrawalWindows[periodId];
    }

    function getInterestRate(uint periodId) public view returns (uint interest) {
        return interestRates[periodId];
    }

    function receiveRevestOutput(
        uint fnftId,
        address asset,
        address payable owner,
        uint quantity
    ) external override {
    }

    function claimRewards(uint fnftId) external {
    }

    function updateLock(uint fnftId, uint, bytes memory) external override {
    }

    function getOutputDisplayValues(uint fnftId) external view override returns (bytes memory) {

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

    function getValue(uint fnftId) external view override returns (uint) {
        return 0;
    }

    function getAsset(uint fnftId) external view override returns (address) {
        return REWARD_TOKEN;
    }

    function setRewardsHandler(address _handler) external onlyPolicy {
        rewardsHandlerAddress = _handler;
    }

    function getDisplayValues(uint fnftId, uint) external view override returns (bytes memory) {
        return abi.encode(100, 0);
    }

    function isUnlockable(uint fnftId, uint) external view override returns (bool) {
        return false;
    }
    function createLock(uint fnftId, uint lockId, bytes memory arguments) external override {
        return;
    }

    function setCustomMetadata(string memory _customMetadataUrl) external onlyPolicy {
        customMetadataUrl = _customMetadataUrl;
    }

    function getCustomMetadata(uint fnftId) external view override returns (string memory) {
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
        uint[] memory fnftIds,
        uint[] memory timePeriod,
        uint [] memory lockedFrom
    ) external onlyPolicy {

    }

    function updateInterestRates(uint[4] memory newRates) external onlyPolicy {
        interestRates = newRates;
    }

    function _msgSender() internal view returns (address){
        return msg.sender;
    }


    // IERC165 interface function

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return (
        interfaceId == type(IOutputReceiver).interfaceId
    || interfaceId == type(IAddressLock).interfaceId
        );
    }

}
