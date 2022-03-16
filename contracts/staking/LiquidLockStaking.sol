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

    struct StakingData {
        uint256 timePeriod;
        uint256 dateLockedFrom;
    }

    // fnftId -> timePeriods
    mapping(uint256 => StakingData) public stakingConfigs;

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
        onlyMasterLock
        returns (uint256)
    {
        require(
            periodId >= 0 && periodId < lockupPeriods.length,
            "LLS: Invalid lock period"
        );
        IERC20(REWARD_TOKEN).safeTransferFrom(msg.sender, address(this), amount);

        IRevest.FNFTConfig memory fnftConfig;
        fnftConfig.asset = REWARD_TOKEN;
        fnftConfig.depositAmount = amount;
        fnftConfig.isMulti = true;

        fnftConfig.pipeToContract = address(this);

        address[] memory recipients = new address[](1);
        recipients[0] = _msgSender();

        uint256[] memory quantities = new uint256[](1);
        // FNFT quantity will always be singular
        quantities[0] = 1;
        uint256 fnftId = getRevest().mintAddressLock{value: msg.value}(
            address(this),
            "",
            recipients,
            quantities,
            fnftConfig
        );

        uint256 interestRate = getInterestRate(periodId);
        uint256 allocPoint = amount * interestRate;

        uint256 daysLockedUp = getLockupPeriod(periodId) / 1 days;
        StakingData memory cfg = StakingData(daysLockedUp, block.timestamp);
        stakingConfigs[fnftId] = cfg;

        IRewardsHandler(rewardsHandlerAddress).updateShares(fnftId, allocPoint);

        emit StakedRevest(periodId, amount, fnftId);
        return fnftId;
    }

    function addToLock(uint256 fnftId, uint256 amount) public {
        //Prevent unauthorized access
        require(
            IFNFTHandler(getRegistry().getRevestFNFT()).getBalance(
                _msgSender(),
                fnftId
            ) == 1,
            "E061"
        );
        uint256 time = stakingConfigs[fnftId].timePeriod;
        require(time > 0, "LLS: not a staked FNFT");
        address asset = ITokenVault(getRegistry().getTokenVault()).getFNFT(fnftId).asset;
        require(asset == REWARD_TOKEN, "LLS: Reward token is incorrect");

        //Pull tokens from caller
        IERC20(asset).safeTransferFrom(_msgSender(), address(this), amount);
        //Claim rewards owed
        IRewardsHandler(rewardsHandlerAddress).claimRewards(fnftId, _msgSender());
        //Write new, extended unlock date
        stakingConfigs[fnftId].dateLockedFrom = block.timestamp;
        //Retrieve current allocation points
        uint256 oldAllocPoints = IRewardsHandler(rewardsHandlerAddress).getAllocPoint(
            fnftId
        );
        uint256 allocPoints = amount * getInterestRate(time) + oldAllocPoints;
        IRewardsHandler(rewardsHandlerAddress).updateShares(fnftId, allocPoints);
        //Deposit additional tokens
        getRevest().depositAdditionalToFNFT(fnftId, amount, 1);
    }

    function unlock(uint256 fnftId, uint256 quantity) external override returns (bool) {
        return false;
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

    modifier onlyMasterLock() {
        require(msg.sender == masterLockAddress, "LLS: sender is not ML");
        _;
    }

    function receiveRevestOutput(
        uint256 fnftId,
        address asset,
        address payable owner,
        uint256 quantity
    ) external override {
        address vault = getRegistry().getTokenVault();
        require(_msgSender() == vault, "E016");

        uint256 totalQuantity = quantity *
            ITokenVault(vault).getFNFT(fnftId).depositAmount;
        IRewardsHandler(rewardsHandlerAddress).claimRewards(fnftId, owner);
        IRewardsHandler(rewardsHandlerAddress).updateShares(fnftId, 0);
        IERC20(REWARD_TOKEN).safeTransfer(owner, totalQuantity);
    }

    function claimRewards(uint256 fnftId) external {
        // Check to make sure user owns the fnftId
        require(
            IFNFTHandler(getRegistry().getRevestFNFT()).getBalance(
                _msgSender(),
                fnftId
            ) == 1,
            "E061"
        );
        // Receive rewards
        IRewardsHandler(rewardsHandlerAddress).claimRewards(fnftId, _msgSender());
    }

    function updateLock(
        uint256 fnftId,
        uint256,
        bytes memory
    ) external override {
        require(
            IFNFTHandler(getRegistry().getRevestFNFT()).getBalance(
                _msgSender(),
                fnftId
            ) == 1,
            "E061"
        );
        // Receive rewards
        IRewardsHandler(rewardsHandlerAddress).claimRewards(fnftId, _msgSender());
    }

    function getOutputDisplayValues(uint256 fnftId)
        external
        view
        override
        returns (bytes memory)
    {
        uint256 rewardsAmount = IRewardsHandler(rewardsHandlerAddress).getRewards(fnftId);
        uint256 timePeriod = stakingConfigs[fnftId].timePeriod;
        uint256 lockStart = stakingConfigs[fnftId].dateLockedFrom;
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

    function getValue(uint256 fnftId) external view override returns (uint256) {
        return IRewardsHandler(rewardsHandlerAddress).getRewards(fnftId);
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
        uint256 allocPoints = IRewardsHandler(rewardsHandlerAddress).getAllocPoint(
            fnftId
        );
        uint256 timePeriod = stakingConfigs[fnftId].timePeriod;
        return abi.encode(allocPoints, timePeriod);
    }

    function isUnlockable(uint256 fnftId, uint256) external view override returns (bool) {
        uint256 timePeriod = stakingConfigs[fnftId].timePeriod;
        uint256 depositTime = stakingConfigs[fnftId].dateLockedFrom;
        uint256 window = getWindow(timePeriod);
        bool mature = block.timestamp - depositTime > window;
        bool window_open = (block.timestamp - depositTime) % (timePeriod * 30 * ONE_DAY) <
            window;
        return mature && window_open;
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
    ) external onlyPolicy {
        for (uint256 i = 0; i < fnftIds.length; i++) {
            stakingConfigs[fnftIds[i]].timePeriod = timePeriod[i];
            stakingConfigs[fnftIds[i]].dateLockedFrom = lockedFrom[i];
        }
    }

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
