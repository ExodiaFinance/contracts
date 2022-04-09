import { MockContract, MockContractFactory, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";

import { TREASURY_DID } from "../../deploy/03_deployTreasury";
import { WOHM_DID } from "../../deploy/17_deployWOHM";
import { FNFT_MASTER_LOCK_DID } from "../../deploy/28_deployFNFTMasterLock";
import { externalAddressRegistry } from "../../packages/sdk/contracts";
import { IExodiaContractsRegistry } from "../../packages/sdk/contracts/exodiaContracts";
import { IExtendedHRE } from "../../packages/HardhatRegistryExtension/ExtendedHRE";
import {
    DAI,
    DAI__factory,
    MasterLock,
    MasterLock__factory,
    MockLocker,
    MockLocker__factory,
    OlympusERC20Token,
    OlympusERC20Token__factory,
    OlympusTreasury,
    OlympusTreasury__factory,
    WOHM,
    WOHM__factory,
} from "../../packages/sdk/typechain";
import "../chai-setup";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, getNetwork, getUnnamedAccounts } = xhre;

const parseUnits = ethers.utils.parseUnits;

const CALLER_NOT_OWNER = "Ownable: caller is not the owner";
const CALLER_NOT_UNLOCKER = "ML: Caller is not an unlocker";

describe.skip("Master Lock", function () {
    let deployer: string;
    let external: string;
    let signer: SignerWithAddress;
    let externalSigner: SignerWithAddress;
    let wsexod: WOHM;
    let exod: OlympusERC20Token;
    let masterLock: MasterLock;
    let masterLockExternal: MasterLock;
    let lockerFactory: MockContractFactory<MockLocker__factory>;
    let locker: MockContract<MockLocker>;
    let dai: DAI;
    let treasury: OlympusTreasury;
    let REVEST_REGISTRY: string;
    beforeEach(async function () {
        const accounts = await getNamedAccounts();
        const [acc0] = await getUnnamedAccounts();
        external = acc0;
        deployer = accounts.deployer;
        signer = await xhre.ethers.getSigner(deployer);
        externalSigner = await xhre.ethers.getSigner(external);
        await deployments.fixture([FNFT_MASTER_LOCK_DID, TREASURY_DID, WOHM_DID]);
        const treasuryDeployment = await get<OlympusTreasury__factory>("OlympusTreasury");
        treasury = treasuryDeployment.contract;
        const wohmDeployment = await get<WOHM__factory>("wOHM");
        wsexod = wohmDeployment.contract;
        const daiDeployment = await get<DAI__factory>("DAI");
        dai = daiDeployment.contract;
        const ohmDeployment = await get<OlympusERC20Token__factory>("OlympusERC20Token");
        exod = ohmDeployment.contract;
        const masterLockDeployment = await get<MasterLock__factory>("MasterLock");
        masterLock = masterLockDeployment.contract;
        const registry = externalAddressRegistry.forNetwork(await getNetwork());
        REVEST_REGISTRY = registry.REVEST_REGISTRY;
        lockerFactory = await smock.mock<MockLocker__factory>("MockLocker");
        locker = await lockerFactory.deploy(REVEST_REGISTRY);

        masterLockExternal = MasterLock__factory.connect(
            masterLock.address,
            externalSigner
        );
    });

    it("Should register locker", async function () {
        const tx = await masterLock.registerLocker(locker.address);
        expect(await masterLock.lockerIdExists(0)).to.be.true;
        expect(await masterLock.getLocker(0)).to.eq(locker.address);
    });

    it("Should not let other register locker", async function () {
        expect(masterLockExternal.registerLocker(locker.address)).to.be.revertedWith(
            CALLER_NOT_OWNER
        );
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
        expect(await masterLock.getNftLocker(nftId)).to.eq(locker.address);
        expect(await masterLock.isUnlockable(nftId, 0)).to.be.false;
        expect(await dai.balanceOf(masterLock.address)).to.eq(depositAmount);
        expect(locker.lock).to.have.been.calledWith(depositAmount, 1);
    });

    it("Should revert if lock id doesn't exists", async function () {
        const depositAmount = parseUnits("1", "ether");
        expect(masterLock.lock(depositAmount, 0, 1)).to.be.revertedWith(
            "ML: LockerContract is not registered"
        );
    });

    it("Should add an unlocker", async function () {
        await masterLock.addUnlocker(external);
        expect(await masterLock.isUnlocker(external)).to.be.true;
    });

    it("Should remove an unlocker", async function () {
        await masterLock.addUnlocker(external);
        await masterLock.removeUnlocker(external);
        expect(await masterLock.isUnlocker(external)).to.be.false;
    });

    it("Should throw if external add unlocker", async function () {
        expect(masterLockExternal.addUnlocker(external)).to.be.revertedWith(
            CALLER_NOT_OWNER
        );
    });

    it("Should throw is external remove unlocker", async function () {
        await masterLock.addUnlocker(external);
        expect(masterLockExternal.removeUnlocker(external)).to.be.revertedWith(
            CALLER_NOT_OWNER
        );
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
        expect(await masterLock.isUnlockable(nftId0, 0)).to.be.false;
        expect(await masterLock.isUnlockable(nftId1, 0)).to.be.false;
        await masterLock.unlockNFT(nftId0);
        expect(await masterLock.isUnlockable(nftId0, 0)).to.be.true;
        expect(await masterLock.isUnlockable(nftId1, 0)).to.be.false;
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
        expect(masterLockExternal.unlockNFT(nftId0)).to.be.revertedWith(
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
        expect(await masterLock.isUnlockable(nftId0, 0)).to.be.false;
        expect(await masterLock.isUnlockable(nftId1, 0)).to.be.false;
        expect(await masterLock.isUnlockable(nftId2, 0)).to.be.false;
        await masterLock.masterUnlock(0);
        expect(await masterLock.isUnlockable(nftId0, 0)).to.be.true;
        expect(await masterLock.isUnlockable(nftId1, 0)).to.be.true;
        expect(await masterLock.isUnlockable(nftId2, 0)).to.be.false;
    });

    it("Should not be able to master unlock if not unlocker", async function () {
        expect(masterLockExternal.masterUnlock(0)).to.be.revertedWith(
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
        expect(await masterLock.isUnlockable(nftId0, 0)).to.be.false;
        expect(await masterLock.isUnlockable(nftId1, 0)).to.be.false;
        await masterLock.unlockNFT(nftId0);
        await masterLock.unlockNFT(nftId1);
        expect(await masterLock.isUnlockable(nftId0, 0)).to.be.true;
        expect(await masterLock.isUnlockable(nftId1, 0)).to.be.true;
        await masterLock.lockNFT(nftId0);
        expect(await masterLock.isUnlockable(nftId0, 0)).to.be.false;
        expect(await masterLock.isUnlockable(nftId1, 0)).to.be.true;
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
        expect(await masterLock.isUnlockable(nftId0, 0)).to.be.false;
        expect(await masterLock.isUnlockable(nftId1, 0)).to.be.false;
        await masterLock.masterUnlock(0);
        expect(await masterLock.isUnlockable(nftId0, 0)).to.be.true;
        expect(await masterLock.isUnlockable(nftId1, 0)).to.be.false;
        await masterLock.masterLock(0);
        expect(await masterLock.isUnlockable(nftId0, 0)).to.be.false;
        expect(await masterLock.isUnlockable(nftId1, 0)).to.be.false;
    });
});
