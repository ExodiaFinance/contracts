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

import "hardhat/console.sol";

contract LiquidLockStaking is Policy, IOutputReceiver, ERC165, IAddressLock {
    using SafeERC20 for IERC20;

    address private revestAddress;
    address public rewardsHandlerAddress;
    address public addressRegistry;

    uint private constant ONE_DAY = 86400;

    uint private constant WINDOW_ONE = ONE_DAY;
    uint private constant WINDOW_THREE = ONE_DAY*5;
    uint private constant WINDOW_SIX = ONE_DAY*9;
    uint private constant WINDOW_TWELVE = ONE_DAY*14;
    uint private constant MAX_INT = 2**256 - 1;
    
    uint[4] internal interestRates = [10,25,70,180];

    string public customMetadataUrl = "https://revest.mypinata.cloud/ipfs/QmeSaVihizntuDQL5BgsujK2nK6bkkwXXzHATGGjM2uyRr";
    string public addressMetadataUrl = "https://revest.mypinata.cloud/ipfs/QmY3KUBToJBthPLvN1Knd7Y51Zxx7FenFhXYV8tPEMVAP3";
    
    event StakedRevest(uint indexed timePeriod, bool indexed isBasic, uint indexed amount, uint fnftId);

    struct StakingData {
        uint timePeriod;
        uint dateLockedFrom;
    }

    // fnftId -> timePeriods
    mapping(uint => StakingData) public stakingConfigs;

    constructor(
        address revestAddress_,
        address rewardsHandlerAddress_,
        address addressRegistry_
    ) {
        revestAddress = revestAddress_;
        addressRegistry = addressRegistry_;
        rewardsHandlerAddress = rewardsHandlerAddress_;

        IERC20(revestAddress).approve(address(getRevest()), MAX_INT);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC165, IERC165) returns (bool) {
        return (
        interfaceId == type(IOutputReceiver).interfaceId
        || interfaceId == type(IAddressLock).interfaceId
        || super.supportsInterface(interfaceId)
        );
    }
    
    function stake(uint amount, uint monthsMaturity) public payable returns (uint) {
        require(monthsMaturity == 3 || monthsMaturity == 6 || monthsMaturity == 12 || monthsMaturity == 24, 'E055');
        IERC20(revestAddress).safeTransferFrom(msg.sender, address(this), amount);

        IRevest.FNFTConfig memory fnftConfig;
        fnftConfig.asset = revestAddress;
        fnftConfig.depositAmount = amount;
        fnftConfig.isMulti = true;

        fnftConfig.pipeToContract = address(this);

        address[] memory recipients = new address[](1);
        recipients[0] = _msgSender();

        uint[] memory quantities = new uint[](1);
        // FNFT quantity will always be singular
        quantities[0] = 1;
        console.log(msg.value);
        //sendFees();
        uint fnftId = getRevest().mintAddressLock(address(this), '', recipients, quantities, fnftConfig);

        uint interestRate = getInterestRate(monthsMaturity);
        uint allocPoint = amount * interestRate;

        StakingData memory cfg = StakingData(monthsMaturity, block.timestamp);
        stakingConfigs[fnftId] = cfg;

        IRewardsHandler(rewardsHandlerAddress).updateShares(fnftId, allocPoint);

        emit StakedRevest(monthsMaturity, true, amount, fnftId);
        return fnftId;
    }

    function sendFees() internal {
        address payable fee_recipient = payable(getRegistry().getAdmin());
        fee_recipient.transfer(msg.value);
    }
    
    function depositAdditionalToStake(uint fnftId, uint amount) public {
        //Prevent unauthorized access
        require(IFNFTHandler(getRegistry().getRevestFNFT()).getBalance(_msgSender(), fnftId) == 1, 'E061');
        uint time = stakingConfigs[fnftId].timePeriod;
        require(time > 0, 'E078');
        address asset = ITokenVault(getRegistry().getTokenVault()).getFNFT(fnftId).asset;
        require(asset == revestAddress, 'E079');

        //Pull tokens from caller
        IERC20(asset).safeTransferFrom(_msgSender(), address(this), amount);
        //Claim rewards owed
        IRewardsHandler(rewardsHandlerAddress).claimRewards(fnftId, _msgSender());
        //Write new, extended unlock date
        stakingConfigs[fnftId].dateLockedFrom = block.timestamp;
        //Retrieve current allocation points – WETH and RVST implicitly have identical alloc points
        uint oldAllocPoints = IRewardsHandler(rewardsHandlerAddress).getAllocPoint(fnftId);
        uint allocPoints = amount * getInterestRate(time) + oldAllocPoints;
        IRewardsHandler(rewardsHandlerAddress).updateShares(fnftId, allocPoints);
        //Deposit additional tokens
        getRevest().depositAdditionalToFNFT(fnftId, amount, 1);
    }

    function getInterestRate(uint months) public view returns (uint) {
        if (months <= 3) {
            return interestRates[0];
        } else if (months <= 6) {
            return interestRates[1];
        } else if (months <= 12) {
            return interestRates[2];
        } else {
            return interestRates[3];
        }
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
        IERC20(revestAddress).safeTransfer(owner, totalQuantity);
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
        uint revestRewards = IRewardsHandler(rewardsHandlerAddress).getRewards(fnftId);
        uint timePeriod = stakingConfigs[fnftId].timePeriod;
        return abi.encode(revestRewards, 0, timePeriod, stakingConfigs[fnftId].dateLockedFrom, revestAddress);
    }

    function setAddressRegistry(address addressRegistry_) external override onlyPolicy {
        addressRegistry = addressRegistry_;
    }

    function getAddressRegistry() external view override returns (address) {
        return addressRegistry;
    }

    function getRevest() private view returns (IRevest) {
        return IRevest(getRegistry().getRevest());
    }

    function getRegistry() public view returns (IAddressRegistry) {
        return IAddressRegistry(addressRegistry);
    }

    function getValue(uint fnftId) external view override returns (uint) {
        return IRewardsHandler(rewardsHandlerAddress).getRewards(fnftId);
    }

    function getAsset(uint fnftId) external view override returns (address) {
        return revestAddress;
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

    function getWindow(uint timePeriod) private pure returns (uint window) {
        if(timePeriod == 1) {
            window = WINDOW_ONE;
        }
        if(timePeriod == 3) {
            window = WINDOW_THREE;
        }
        if(timePeriod == 6) {
            window = WINDOW_SIX;
        }
        if(timePeriod == 12) {
            window = WINDOW_TWELVE;
        }
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

}
