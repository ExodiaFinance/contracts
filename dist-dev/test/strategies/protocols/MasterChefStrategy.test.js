"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const utils_1 = require("ethers/lib/utils");
const hardhat_1 = __importDefault(require("hardhat"));
const _00_deployDai_1 = require("../../../deploy/00_deployDai");
const _30_deployAssetAllocator_1 = require("../../../deploy/30_deployAssetAllocator");
const _31_deployARFVToken_1 = require("../../../deploy/31_deployARFVToken");
const _38_deployExodiaRoles_1 = require("../../../deploy/38_deployExodiaRoles");
const _41_deployFarmer_1 = require("../../../deploy/41_deployFarmer");
const contracts_1 = require("../../../packages/sdk/contracts");
const typechain_1 = require("../../../packages/sdk/typechain");
require("../../chai-setup");
const errors_1 = require("../../errors");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts, getUnnamedAccounts, getNetwork } = xhre;
const A_LATE_QUARTET = "0xf3A602d30dcB723A74a0198313a7551FEacA7DAc";
describe("MasterChefStrategy", function () {
    let deployer;
    let randomAddress;
    let treasury;
    let exod;
    let dai;
    let bptQuartet;
    let beets;
    let bptBalance;
    let assetAllocator;
    let allocationCalculator;
    let masterChefStrat;
    let roles;
    let addressRegistry;
    let farmer;
    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        const unnamedAccounts = await getUnnamedAccounts();
        deployer = namedAccounts.deployer;
        randomAddress = unnamedAccounts[0];
        await deployments.fixture([
            _30_deployAssetAllocator_1.ASSET_ALLOCATOR_DID,
            _00_deployDai_1.DAI_DID,
            _31_deployARFVToken_1.ARFV_TOKEN_DID,
            _38_deployExodiaRoles_1.EXODIA_ROLES_DID,
            _41_deployFarmer_1.FARMER_DID,
        ]);
        const treasuryDeployment = await get("OlympusTreasury");
        treasury = treasuryDeployment.contract;
        const exodDeployment = await get("OlympusERC20Token");
        exod = exodDeployment.contract;
        const daiDeployment = await get("DAI");
        dai = daiDeployment.contract;
        const assetAllocateDeployment = await get("AssetAllocator");
        assetAllocator = assetAllocateDeployment.contract;
        await assetAllocator.addMachine(deployer);
        const allocCalcDeployment = await get("AllocationCalculator");
        allocationCalculator = allocCalcDeployment.contract;
        const farmerDeployment = await get("Farmer");
        farmer = farmerDeployment.contract;
        const rolesDeployment = await get("ExodiaRoles");
        roles = rolesDeployment.contract;
        await roles.addStrategist(deployer);
        addressRegistry = await contracts_1.externalAddressRegistry.forNetwork(
            await getNetwork()
        );
        const { BEETS_MASTERCHEF, BEETS } = addressRegistry;
        const deployment = await deployments.deploy("MasterChefStrategy", {
            from: deployer,
            args: [],
        });
        const deployerSigner = await xhre.ethers.getSigner(deployer);
        masterChefStrat = typechain_1.MasterChefStrategy__factory.connect(
            deployment.address,
            deployerSigner
        );
        await masterChefStrat.initialize(
            BEETS_MASTERCHEF,
            BEETS,
            assetAllocator.address,
            roles.address
        );
        await masterChefStrat.addMachine(assetAllocator.address);
        beets = typechain_1.ERC20__factory.connect(BEETS, deployerSigner);
        const quartetHolderAddress = "0x6e7de22562a8026da3fa2e2b174a89931822bb1b";
        await hardhat_1.default.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [quartetHolderAddress],
        });
        const quartetHolder = await xhre.ethers.getSigner(quartetHolderAddress);
        bptQuartet = typechain_1.ERC20__factory.connect(A_LATE_QUARTET, quartetHolder);
        bptBalance = await bptQuartet.balanceOf(quartetHolderAddress);
        await bptQuartet.transfer(treasury.address, bptBalance);
        await allocationCalculator.setAllocation(
            A_LATE_QUARTET,
            [masterChefStrat.address],
            [100000]
        );
        const { FBEETS_BAR } = addressRegistry;
        await masterChefStrat.setPid(FBEETS_BAR, 22);
        await masterChefStrat.setPid(A_LATE_QUARTET, 17);
        await farmer.setLimit(A_LATE_QUARTET, 100000, 0, 0);
    });
    it("Treasury should hold BPT-QUARTET", async function () {
        (0, chai_1.expect)(await bptQuartet.balanceOf(treasury.address)).to.not.eq(0);
    });
    it("Should set pid", async function () {
        (0, chai_1.expect)(await masterChefStrat.getPid(A_LATE_QUARTET)).to.eq(17);
    });
    it("Should revert if PID does not match token", async function () {
        await (0, chai_1.expect)(masterChefStrat.setPid(deployer, 17)).to.be.revertedWith(
            "MCS: PID does not match token"
        );
    });
    it("Should allocate and deposit", async function () {
        await farmer.rebalance(A_LATE_QUARTET);
        (0, chai_1.expect)(await masterChefStrat.deposited(A_LATE_QUARTET)).to.eq(
            bptBalance
        );
        (0, chai_1.expect)(await masterChefStrat.balance(A_LATE_QUARTET)).to.eq(
            bptBalance
        );
        (0, chai_1.expect)(await bptQuartet.balanceOf(masterChefStrat.address)).to.eq(0);
    });
    it("Should collect rewards", async function () {
        const beetsBal = await beets.balanceOf(treasury.address);
        await bptQuartet.approve(assetAllocator.address, bptBalance);
        await farmer.rebalance(A_LATE_QUARTET);
        await xhre.ethers.provider.send("evm_increaseTime", [3600]);
        await xhre.ethers.provider.send("evm_mine", []);
        await farmer.harvest(A_LATE_QUARTET);
        (0, chai_1.expect)(await beets.balanceOf(treasury.address)).to.be.gt(beetsBal);
    });
    it("Should return deposit to treasury", async function () {
        const beetsBal = await beets.balanceOf(treasury.address);
        await farmer.rebalance(A_LATE_QUARTET);
        const deposited = await masterChefStrat.deposited(A_LATE_QUARTET);
        await xhre.ethers.provider.send("evm_increaseTime", [3600]);
        await xhre.ethers.provider.send("evm_mine", []);
        await farmer.setLimit(A_LATE_QUARTET, 0, 0, 0);
        await farmer.rebalance(A_LATE_QUARTET);
        (0, chai_1.expect)(await bptQuartet.balanceOf(masterChefStrat.address)).to.eq(0);
        (0, chai_1.expect)(await bptQuartet.balanceOf(assetAllocator.address)).to.eq(0);
        (0, chai_1.expect)(await bptQuartet.balanceOf(farmer.address)).to.eq(0);
        (0, chai_1.expect)(await bptQuartet.balanceOf(treasury.address)).to.eq(deposited);
        (0, chai_1.expect)(await beets.balanceOf(treasury.address)).to.be.gt(beetsBal);
        (0, chai_1.expect)(await masterChefStrat.deposited(A_LATE_QUARTET)).to.eq(0);
        (0, chai_1.expect)(await masterChefStrat.balance(A_LATE_QUARTET)).to.eq(0);
    });
    it("Should exit farm and put funds in the strat (with harvest)", async function () {
        await farmer.rebalance(A_LATE_QUARTET);
        await xhre.ethers.provider.send("evm_increaseTime", [3600]);
        await xhre.ethers.provider.send("evm_mine", []);
        await masterChefStrat.exit(A_LATE_QUARTET);
        (0, chai_1.expect)(await beets.balanceOf(masterChefStrat.address)).to.be.gt(0);
        (0, chai_1.expect)(await bptQuartet.balanceOf(masterChefStrat.address)).to.be.eq(
            bptBalance
        );
    });
    it("Should exit the strat and put funds in the strat (no harvest)", async function () {
        await farmer.rebalance(A_LATE_QUARTET);
        await xhre.ethers.provider.send("evm_increaseTime", [3600]);
        await xhre.ethers.provider.send("evm_mine", []);
        await masterChefStrat.emergencyExit(A_LATE_QUARTET);
        (0, chai_1.expect)(await beets.balanceOf(masterChefStrat.address)).to.be.eq(0);
        (0, chai_1.expect)(await bptQuartet.balanceOf(masterChefStrat.address)).to.be.eq(
            bptBalance
        );
        (0, chai_1.expect)(await masterChefStrat.deposited(A_LATE_QUARTET)).to.eq(0);
        (0, chai_1.expect)(await masterChefStrat.balance(A_LATE_QUARTET)).to.eq(
            bptBalance
        );
    });
    it("Should send funds in contract to DAO", async function () {
        const mintAmount = (0, utils_1.parseEther)("1");
        await dai.mint(masterChefStrat.address, mintAmount);
        await masterChefStrat.extractToDAO(dai.address);
        (0, chai_1.expect)(await dai.balanceOf(await roles.DAO_ADDRESS())).to.eq(
            mintAmount
        );
    });
    it("Should pause deploy", async function () {
        await masterChefStrat.pause();
        await (0, chai_1.expect)(farmer.rebalance(A_LATE_QUARTET)).to.be.revertedWith(
            errors_1.PAUSABLE_PAUSED
        );
    });
    it("Should unpause deploy", async function () {
        await masterChefStrat.pause();
        await masterChefStrat.unPause();
        await (0, chai_1.expect)(farmer.rebalance(A_LATE_QUARTET)).to.not.be.reverted;
    });
    describe("permissions", async function () {
        let user;
        let mcsUser;
        const CALLER_IS_NOT_ALLOCATOR = "Strategy: caller is not allocator";
        const CALLER_IS_NOT_STRATEGIST = "caller is not a strategist";
        beforeEach(async () => {
            user = await xhre.ethers.getSigner(randomAddress);
            mcsUser = masterChefStrat.connect(user);
        });
        it("Should only let allocator call withdrawTo", async function () {
            await (0, chai_1.expect)(
                mcsUser.withdrawTo(bptQuartet.address, 100, user.address)
            ).to.be.revertedWith(CALLER_IS_NOT_ALLOCATOR);
        });
        it("Should only let allocator call emergencyWithdrawTo", async function () {
            await (0, chai_1.expect)(
                mcsUser.emergencyWithdrawTo(bptQuartet.address, user.address)
            ).to.be.revertedWith(CALLER_IS_NOT_ALLOCATOR);
        });
        it("Should only let allocator call collectProfits", async function () {
            await (0, chai_1.expect)(
                mcsUser.collectProfits(bptQuartet.address, user.address)
            ).to.be.revertedWith(CALLER_IS_NOT_ALLOCATOR);
        });
        it("Should only let allocator call collectRewards", async function () {
            await (0, chai_1.expect)(
                mcsUser.collectRewards(bptQuartet.address, user.address)
            ).to.be.revertedWith(CALLER_IS_NOT_ALLOCATOR);
        });
        it("Should only let strategist call exit", async function () {
            await (0, chai_1.expect)(mcsUser.exit(bptQuartet.address)).to.be.revertedWith(
                CALLER_IS_NOT_STRATEGIST
            );
        });
        it("Should only let strategist call emergencyExit", async function () {
            await (0, chai_1.expect)(
                mcsUser.emergencyExit(bptQuartet.address)
            ).to.be.revertedWith(CALLER_IS_NOT_STRATEGIST);
        });
        it("Should only let strategist call extractToDao", async function () {
            await (0, chai_1.expect)(
                mcsUser.extractToDAO(bptQuartet.address)
            ).to.be.revertedWith(CALLER_IS_NOT_STRATEGIST);
        });
        it("Should only let strategist update PID", async function () {
            await (0, chai_1.expect)(
                mcsUser.setPid(bptQuartet.address, 17)
            ).to.be.revertedWith(CALLER_IS_NOT_STRATEGIST);
        });
    });
});
