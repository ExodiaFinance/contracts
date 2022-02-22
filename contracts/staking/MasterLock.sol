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
import "./ILocker.sol";

import "../Policy.sol";

import "hardhat/console.sol";

contract MasterLock is Policy, IOutputReceiver, ERC165, IAddressLock {
    using SafeERC20 for IERC20;
    
    mapping(uint => uint8) lockedBy;
    address[] lockerContracts;
    mapping(uint => bool) nftUnlocks;
    mapping(uint8 => bool) masterUnlocks;
    mapping(address => bool) unlockers;

    address revestRegistry;

    event StakedRevest(uint indexed timePeriod, uint indexed amount, uint fnftId);

    constructor(
        address _revestRegistry
    ) {
        revestRegistry = _revestRegistry;
    }
    
    function lock(uint amount, uint8 lockerId, uint8 periodId) external payable contractIdRegistered(lockerId){
        ILocker locker = ILocker(lockerContracts[lockerId]);
        address token = locker.getToken();
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(token).approve(address(locker), amount);
        uint nftId = locker.lock{value: msg.value}(amount, periodId);
        lockedBy[nftId] = lockerId;
    }
    
    function addToLock(uint nftId, uint amount) external onlyNFTOwner(nftId) returns (bool){
        return true;
    }
    
    function unlock(uint nftId) external onlyNFTOwner(nftId) returns (bool){
        
        return true;
    }
    
    function registerLocker(address lockerAddress) external onlyPolicy returns (uint8) {
        require(lockerAddress != address(0), "ML: can't add null address");
        require(lockerContracts.length < 255, "ML: max locker reached");
        uint8 index = uint8(lockerContracts.length);
        lockerContracts.push(lockerAddress);
        return index;
    }
    
    function unlockNFT(uint id) external onlyUnlocker {
        nftUnlocks[id] = true;
    }
    
    function lockNFT(uint id) external onlyUnlocker {
        nftUnlocks[id] = false;
    }
    
    function masterUnlock(uint8 id) external onlyUnlocker contractIdRegistered(id){
        masterUnlocks[id] = true;
    }
    
    function masterLock(uint8 id) external onlyUnlocker contractIdRegistered(id){
        masterUnlocks[id] = false;
    }
    
    modifier onlyUnlocker() {
        require( isUnlocker(msg.sender), "ML: Caller is not an unlocker" );
        _;
    }
    
    function isUnlocker(address _unlocker) public view returns (bool){
        return _owner == _unlocker || unlockers[_unlocker];
    }
    
    function addUnlocker(address _unlocker) external onlyPolicy{
        unlockers[_unlocker] = true;
    }
    
    function removeUnlocker(address _unlocker) external onlyPolicy{
        unlockers[_unlocker] = false;
    }
    
    modifier contractIdRegistered(uint8 id) {
        require(lockerIdExists(id), "ML: LockerContract is not registered");
        _;
    }
    
    function lockerIdExists(uint8 id) public view returns (bool){
        return id < lockerContracts.length;
    }

    modifier onlyNFTOwner(uint id){
        require(IFNFTHandler(getRegistry().getRevestFNFT()).getBalance(msg.sender, id) == 1, 'ML: Caller is not the owner');
        _;
    }
    
    function getNftLocker(uint fnftId) public view returns(address){
        uint8 lockerId = lockedBy[fnftId];
        return lockerContracts[lockerId];
    }

    function getLocker(uint8 id) external view returns (address){
        return lockerContracts[id];
    }
    
    // IERC165 interface function
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC165, IERC165) returns (bool) {
        return (
        interfaceId == type(IOutputReceiver).interfaceId
    || interfaceId == type(IAddressLock).interfaceId
    || super.supportsInterface(interfaceId)
        );
    }

    // IOuputReceiver interface functions
    function receiveRevestOutput(
        uint fnftId,
        address asset,
        address payable owner,
        uint quantity
    ) external override {
        address locker = getNftLocker(fnftId);
        return IOutputReceiver(locker).receiveRevestOutput(fnftId, asset, owner, quantity);
    }

    function getCustomMetadata(uint fnftId) external view override returns (string memory) {
        address locker = getNftLocker(fnftId);
        return IOutputReceiver(locker).getCustomMetadata(fnftId);
    }
    
    function getOutputDisplayValues(uint fnftId) external view override returns (bytes memory) {
        address locker = getNftLocker(fnftId);
        return IOutputReceiver(locker).getOutputDisplayValues(fnftId);
    }

    function getValue(uint fnftId) external view override returns (uint) {
        address locker = getNftLocker(fnftId);
        return IOutputReceiver(locker).getValue(fnftId);
    }

    function getAsset(uint fnftId) external view override returns (address) {
        address locker = getNftLocker(fnftId);
        return IOutputReceiver(locker).getAsset(fnftId);
    }

    // IAddressLock interface functions
    
    function updateLock(uint fnftId, uint lockId, bytes memory arguments) external override {
        address locker = getNftLocker(fnftId);
        IAddressLock(locker).updateLock(fnftId, lockId, arguments);
    }
    
    function getDisplayValues(uint fnftId, uint lockId) external view override returns (bytes memory) {
        address locker = getNftLocker(fnftId);
        return IAddressLock(locker).getDisplayValues(fnftId, lockId);
    }

    function isUnlockable(uint fnftId, uint lockId) external view override returns (bool) {
        address locker = getNftLocker(fnftId);
        return isMasterUnlocked(fnftId) || IAddressLock(locker).isUnlockable(fnftId, lockId);
    }
    
    function isMasterUnlocked(uint fnftId) public view returns (bool){
        return nftUnlocks[fnftId] || masterUnlocks[lockedBy[fnftId]];
    }

    function createLock(uint fnftId, uint lockId, bytes memory arguments) external override {
        address locker = getNftLocker(fnftId);
        IAddressLock(locker).createLock(fnftId, lockId, arguments);
    }

    function getMetadata() external view override returns (string memory) {
        /*address locker = getNftLocker(fnftId);
        return IAddressLock(locker).getMetadata();*/
        return "";
    }

    function needsUpdate() external pure override returns (bool) {
        return true;
    }

    // IAddressRegistry
    
    function setAddressRegistry(address _revestRegistry) external override onlyPolicy {
        revestRegistry = _revestRegistry;
    }
    
    function getAddressRegistry() external view override returns (address){
        return revestRegistry;
    }
    
    function getRevest() private view returns (IRevest) {
        return IRevest(getRegistry().getRevest());
    }

    function getRegistry() public view returns (IAddressRegistry) {
        return IAddressRegistry(revestRegistry);
    }
    
    function _msgSender() internal view returns (address){
        return msg.sender;
    }

}
