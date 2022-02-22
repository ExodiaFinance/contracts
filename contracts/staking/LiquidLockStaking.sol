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

contract LiquidLockStaking is Policy, IOutputReceiver, IAddressLock, ILocker {
    using SafeERC20 for IERC20;

    address private REWARD_TOKEN;
    address public rewardsHandlerAddress;
    address public revestRegistryAddress;
    address private masterLockAddress;

    uint private constant ONE_DAY = 86400;

    // Default values
    uint[] public interestRates = [4, 13, 27, 56];
    uint[] public lockupPeriods = [30 days, 90 days, 180 days, 360 days];
    uint[] public withdrawalWindows = [1 days, 5 days, 9 days, 14 days];
    uint private constant MAX_INT = 2**256 - 1;
    
    string public customMetadataUrl = "https://revest.mypinata.cloud/ipfs/QmeSaVihizntuDQL5BgsujK2nK6bkkwXXzHATGGjM2uyRr";
    string public addressMetadataUrl = "https://revest.mypinata.cloud/ipfs/QmY3KUBToJBthPLvN1Knd7Y51Zxx7FenFhXYV8tPEMVAP3";
    
    event StakedRevest(uint indexed timePeriod, uint indexed amount, uint fnftId);

    struct StakingData {
        uint timePeriod;
        uint dateLockedFrom;
    }

    // fnftId -> timePeriods
    mapping(uint => StakingData) public stakingConfigs;

    constructor(
        address _rewardTokenAddress,
        address _rewardHandlerAddress,
        address _revestRegistry,
        address _masterLock
    ) {
        REWARD_TOKEN = _rewardTokenAddress;
        revestRegistryAddress = _revestRegistry;
        rewardsHandlerAddress = _rewardHandlerAddress;
        masterLockAddress = _masterLock;
        IERC20(REWARD_TOKEN).approve(address(getRevest()), MAX_INT);
    }
    
    function getToken() external view override returns(address){
        return REWARD_TOKEN;
    }    
    
    function getRewardsToken() external view override returns(address){
        return REWARD_TOKEN;
    }
    
    function lock(uint amount, uint8 periodId) external override onlyMasterLock payable returns (uint) {
        require(periodId >=0 && periodId < lockupPeriods.length, 'LLS: Invalid lock period');
        IERC20(REWARD_TOKEN).safeTransferFrom(msg.sender, address(this), amount);

        IRevest.FNFTConfig memory fnftConfig;
        fnftConfig.asset = REWARD_TOKEN;
        fnftConfig.depositAmount = amount;
        fnftConfig.isMulti = true;

        fnftConfig.pipeToContract = address(this);

        address[] memory recipients = new address[](1);
        recipients[0] = _msgSender();

        uint[] memory quantities = new uint[](1);
        // FNFT quantity will always be singular
        quantities[0] = 1;
        uint fnftId = getRevest().mintAddressLock{value:msg.value}(address(this), '', recipients, quantities, fnftConfig);

        uint interestRate = getInterestRate(periodId);
        uint allocPoint = amount * interestRate;
        
        uint daysLockedUp = getLockupPeriod(periodId)/1 days;
        StakingData memory cfg = StakingData(daysLockedUp, block.timestamp);
        stakingConfigs[fnftId] = cfg;

        IRewardsHandler(rewardsHandlerAddress).updateShares(fnftId, allocPoint);

        emit StakedRevest(periodId, amount, fnftId);
        return fnftId;
    }
    
    function addToLock(uint fnftId, uint amount) public {
        //Prevent unauthorized access
        require(IFNFTHandler(getRegistry().getRevestFNFT()).getBalance(_msgSender(), fnftId) == 1, 'E061');
        uint time = stakingConfigs[fnftId].timePeriod;
        require(time > 0, 'LLS: not a staked FNFT');
        address asset = ITokenVault(getRegistry().getTokenVault()).getFNFT(fnftId).asset;
        require(asset == REWARD_TOKEN, 'LLS: Reward token is incorrect');

        //Pull tokens from caller
        IERC20(asset).safeTransferFrom(_msgSender(), address(this), amount);
        //Claim rewards owed
        IRewardsHandler(rewardsHandlerAddress).claimRewards(fnftId, _msgSender());
        //Write new, extended unlock date
        stakingConfigs[fnftId].dateLockedFrom = block.timestamp;
        //Retrieve current allocation points
        uint oldAllocPoints = IRewardsHandler(rewardsHandlerAddress).getAllocPoint(fnftId);
        uint allocPoints = amount * getInterestRate(time) + oldAllocPoints;
        IRewardsHandler(rewardsHandlerAddress).updateShares(fnftId, allocPoints);
        //Deposit additional tokens
        getRevest().depositAdditionalToFNFT(fnftId, amount, 1);
    }

    function unlock(uint fnftId, uint quantity) external override returns (bool){
        return false;
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
    
    modifier onlyMasterLock() {
        require(msg.sender == masterLockAddress, "LLS: sender is not ML");
        _;
    }
    
    function receiveRevestOutput(
        uint fnftId,
        address asset,
        address payable owner,
        uint quantity
    ) external override {
        address vault = getRegistry().getTokenVault();
        require(_msgSender() == vault, "E016");

        uint totalQuantity = quantity * ITokenVault(vault).getFNFT(fnftId).depositAmount;
        IRewardsHandler(rewardsHandlerAddress).claimRewards(fnftId, owner);
        IRewardsHandler(rewardsHandlerAddress).updateShares(fnftId, 0);
        IERC20(REWARD_TOKEN).safeTransfer(owner, totalQuantity);
    }

    function claimRewards(uint fnftId) external {
        // Check to make sure user owns the fnftId
        require(IFNFTHandler(getRegistry().getRevestFNFT()).getBalance(_msgSender(), fnftId) == 1, 'E061');
        // Receive rewards
        IRewardsHandler(rewardsHandlerAddress).claimRewards(fnftId, _msgSender());
    }

    function updateLock(uint fnftId, uint, bytes memory) external override {
        require(IFNFTHandler(getRegistry().getRevestFNFT()).getBalance(_msgSender(), fnftId) == 1, 'E061');
        // Receive rewards
        IRewardsHandler(rewardsHandlerAddress).claimRewards(fnftId, _msgSender());
    }

    function getOutputDisplayValues(uint fnftId) external view override returns (bytes memory) {
        uint rewardsAmount = IRewardsHandler(rewardsHandlerAddress).getRewards(fnftId);
        uint timePeriod = stakingConfigs[fnftId].timePeriod;
        uint lockStart = stakingConfigs[fnftId].dateLockedFrom;
        return abi.encode(rewardsAmount, timePeriod, lockStart, REWARD_TOKEN);
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
        return IRewardsHandler(rewardsHandlerAddress).getRewards(fnftId);
    }

    function getAsset(uint fnftId) external view override returns (address) {
        return REWARD_TOKEN;
    }

    function setRewardsHandler(address _handler) external onlyPolicy {
        rewardsHandlerAddress = _handler;
    }
    
    function getDisplayValues(uint fnftId, uint) external view override returns (bytes memory) {
        uint allocPoints = IRewardsHandler(rewardsHandlerAddress).getAllocPoint(fnftId);
        uint timePeriod = stakingConfigs[fnftId].timePeriod;
        return abi.encode(allocPoints, timePeriod);
    }

    function isUnlockable(uint fnftId, uint) external view override returns (bool) {
        uint timePeriod = stakingConfigs[fnftId].timePeriod;
        uint depositTime = stakingConfigs[fnftId].dateLockedFrom;
        uint window = getWindow(timePeriod);
        bool mature = block.timestamp - depositTime > window;
        bool window_open = (block.timestamp - depositTime) % (timePeriod * 30 * ONE_DAY) < window;
        return mature && window_open;
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
        for(uint i = 0; i < fnftIds.length; i++) {
            stakingConfigs[fnftIds[i]].timePeriod = timePeriod[i];
            stakingConfigs[fnftIds[i]].dateLockedFrom = lockedFrom[i];
        }
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
