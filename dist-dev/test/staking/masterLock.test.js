"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const smock_1 = require("@defi-wonderland/smock");
const chai_1 = require("chai");
const ethers_1 = require("ethers");
const hardhat_1 = __importDefault(require("hardhat"));
const _03_deployTreasury_1 = require("../../deploy/03_deployTreasury");
const _17_deployWOHM_1 = require("../../deploy/17_deployWOHM");
const _28_deployFNFTMasterLock_1 = require("../../deploy/28_deployFNFTMasterLock");
const contracts_1 = require("../../packages/sdk/contracts");
const typechain_1 = require("../../packages/sdk/typechain");
require("../chai-setup");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts, getNetwork, getUnnamedAccounts } = xhre;
const parseUnits = ethers_1.ethers.utils.parseUnits;
const CALLER_NOT_OWNER = "Ownable: caller is not the owner";
const CALLER_NOT_UNLOCKER = "ML: Caller is not an unlocker";
describe("Master Lock", function () {
    let deployer;
    let external;
    let signer;
    let externalSigner;
    let wsexod;
    let exod;
    let masterLock;
    let masterLockExternal;
    let lockerFactory;
    let locker;
    let dai;
    let treasury;
    let REVEST_REGISTRY;
    beforeEach(async function () {
        const accounts = await getNamedAccounts();
        const [acc0] = await getUnnamedAccounts();
        external = acc0;
        deployer = accounts.deployer;
        signer = await xhre.ethers.getSigner(deployer);
        externalSigner = await xhre.ethers.getSigner(external);
        await deployments.fixture([
            _28_deployFNFTMasterLock_1.FNFT_MASTER_LOCK_DID,
            _03_deployTreasury_1.TREASURY_DID,
            _17_deployWOHM_1.WOHM_DID,
        ]);
        const treasuryDeployment = await get("OlympusTreasury");
        treasury = treasuryDeployment.contract;
        const wohmDeployment = await get("wOHM");
        wsexod = wohmDeployment.contract;
        const daiDeployment = await get("DAI");
        dai = daiDeployment.contract;
        const ohmDeployment = await get("OlympusERC20Token");
        exod = ohmDeployment.contract;
        const masterLockDeployment = await get("MasterLock");
        masterLock = masterLockDeployment.contract;
        const registry = contracts_1.externalAddressRegistry.forNetwork(
            await getNetwork()
        );
        REVEST_REGISTRY = registry.REVEST_REGISTRY;
        lockerFactory = await smock_1.smock.mock("MockLocker");
        locker = await lockerFactory.deploy(REVEST_REGISTRY);
        masterLockExternal = typechain_1.MasterLock__factory.connect(
            masterLock.address,
            externalSigner
        );
    });
    it("Should register locker", async function () {
        const tx = await masterLock.registerLocker(locker.address);
        (0, chai_1.expect)(await masterLock.lockerIdExists(0)).to.be.true;
        (0, chai_1.expect)(await masterLock.getLocker(0)).to.eq(locker.address);
    });
    it("Should not let other register locker", async function () {
        (0, chai_1.expect)(
            masterLockExternal.registerLocker(locker.address)
        ).to.be.revertedWith(CALLER_NOT_OWNER);
    });
    it("Should add the lock and send funds to ML", async function () {
        await masterLock.registerLocker(locker.address);
        const nftId = 12;
        const depositAmount = parseUnits("1", "ether");
        locker.lock.returns(nftId);
        locker.getToken.returns(dai.address);
        await dai.mint(deployer, depositAmount);
        await dai.approve(masterLock.address, depositAmount);
        await masterLock.lock(depositAmount, 0, 1);
        (0, chai_1.expect)(await masterLock.getNftLocker(nftId)).to.eq(locker.address);
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId, 0)).to.be.false;
        (0, chai_1.expect)(await dai.balanceOf(masterLock.address)).to.eq(depositAmount);
        (0, chai_1.expect)(locker.lock).to.have.been.calledWith(depositAmount, 1);
    });
    it("Should revert if lock id doesn't exists", async function () {
        const depositAmount = parseUnits("1", "ether");
        (0, chai_1.expect)(masterLock.lock(depositAmount, 0, 1)).to.be.revertedWith(
            "ML: LockerContract is not registered"
        );
    });
    it("Should add an unlocker", async function () {
        await masterLock.addUnlocker(external);
        (0, chai_1.expect)(await masterLock.isUnlocker(external)).to.be.true;
    });
    it("Should remove an unlocker", async function () {
        await masterLock.addUnlocker(external);
        await masterLock.removeUnlocker(external);
        (0, chai_1.expect)(await masterLock.isUnlocker(external)).to.be.false;
    });
    it("Should throw if external add unlocker", async function () {
        (0, chai_1.expect)(masterLockExternal.addUnlocker(external)).to.be.revertedWith(
            CALLER_NOT_OWNER
        );
    });
    it("Should throw is external remove unlocker", async function () {
        await masterLock.addUnlocker(external);
        (0, chai_1.expect)(
            masterLockExternal.removeUnlocker(external)
        ).to.be.revertedWith(CALLER_NOT_OWNER);
    });
    it("Should unlock the NFT", async function () {
        await masterLock.registerLocker(locker.address);
        const nftId0 = 12;
        const depositAmount = parseUnits("1", "ether");
        locker.lock.returns(nftId0);
        locker.getToken.returns(dai.address);
        await dai.mint(deployer, depositAmount);
        await dai.approve(masterLock.address, depositAmount);
        await masterLock.lock(depositAmount.div(2), 0, 1);
        const nftId1 = 20;
        locker.lock.returns(nftId1);
        await masterLock.lock(depositAmount.div(2), 0, 1);
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId0, 0)).to.be.false;
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId1, 0)).to.be.false;
        await masterLock.unlockNFT(nftId0);
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId0, 0)).to.be.true;
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId1, 0)).to.be.false;
    });
    it("Should not be able to unlock if not unlocker", async function () {
        await masterLock.registerLocker(locker.address);
        const nftId0 = 12;
        const depositAmount = parseUnits("1", "ether");
        locker.lock.returns(nftId0);
        locker.getToken.returns(dai.address);
        await dai.mint(deployer, depositAmount);
        await dai.approve(masterLock.address, depositAmount);
        await masterLock.lock(depositAmount, 0, 1);
        (0, chai_1.expect)(masterLockExternal.unlockNFT(nftId0)).to.be.revertedWith(
            CALLER_NOT_UNLOCKER
        );
    });
    it("Should unlock all NFT locked in locker", async function () {
        await masterLock.registerLocker(locker.address);
        await masterLock.registerLocker(locker.address);
        const nftId0 = 12;
        const depositAmount = parseUnits("1", "ether");
        locker.lock.returns(nftId0);
        locker.getToken.returns(dai.address);
        await dai.mint(deployer, depositAmount);
        await dai.approve(masterLock.address, depositAmount);
        await masterLock.lock(depositAmount.div(3), 0, 1);
        const nftId1 = 20;
        locker.lock.returns(nftId1);
        await masterLock.lock(depositAmount.div(3), 0, 1);
        const nftId2 = 25;
        locker.lock.returns(nftId2);
        await masterLock.lock(depositAmount.div(3), 1, 1);
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId0, 0)).to.be.false;
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId1, 0)).to.be.false;
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId2, 0)).to.be.false;
        await masterLock.masterUnlock(0);
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId0, 0)).to.be.true;
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId1, 0)).to.be.true;
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId2, 0)).to.be.false;
    });
    it("Should not be able to master unlock if not unlocker", async function () {
        (0, chai_1.expect)(masterLockExternal.masterUnlock(0)).to.be.revertedWith(
            CALLER_NOT_UNLOCKER
        );
    });
    it("Should relock the NFT", async function () {
        await masterLock.registerLocker(locker.address);
        const nftId0 = 12;
        const depositAmount = parseUnits("1", "ether");
        locker.lock.returns(nftId0);
        locker.getToken.returns(dai.address);
        await dai.mint(deployer, depositAmount);
        await dai.approve(masterLock.address, depositAmount);
        await masterLock.lock(depositAmount.div(2), 0, 1);
        const nftId1 = 20;
        locker.lock.returns(nftId1);
        await masterLock.lock(depositAmount.div(2), 0, 1);
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId0, 0)).to.be.false;
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId1, 0)).to.be.false;
        await masterLock.unlockNFT(nftId0);
        await masterLock.unlockNFT(nftId1);
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId0, 0)).to.be.true;
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId1, 0)).to.be.true;
        await masterLock.lockNFT(nftId0);
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId0, 0)).to.be.false;
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId1, 0)).to.be.true;
    });
    it("Should relock all NFT locked in locker", async function () {
        await masterLock.registerLocker(locker.address);
        await masterLock.registerLocker(locker.address);
        const nftId0 = 12;
        const depositAmount = parseUnits("1", "ether");
        locker.lock.returns(nftId0);
        locker.getToken.returns(dai.address);
        await dai.mint(deployer, depositAmount);
        await dai.approve(masterLock.address, depositAmount);
        await masterLock.lock(depositAmount.div(3), 0, 1);
        const nftId1 = 20;
        locker.lock.returns(nftId1);
        await masterLock.lock(depositAmount.div(3), 1, 1);
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId0, 0)).to.be.false;
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId1, 0)).to.be.false;
        await masterLock.masterUnlock(0);
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId0, 0)).to.be.true;
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId1, 0)).to.be.false;
        await masterLock.masterLock(0);
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId0, 0)).to.be.false;
        (0, chai_1.expect)(await masterLock.isUnlockable(nftId1, 0)).to.be.false;
    });
});
