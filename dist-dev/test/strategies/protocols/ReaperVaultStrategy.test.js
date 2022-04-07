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
const REAPER_DAI_VAULT = "0x85ea7Ee24204B3DFEEA5d28b3Fd791D8fD1409b8";
describe("ReaperVault", function () {
    let deployer;
    let randomAddress;
    let treasury;
    let exod;
    let DAI;
    let dai;
    let daiBalance;
    let assetAllocator;
    let allocationCalculator;
    let reaperStrategy;
    let roles;
    let farmer;
    const deploy = deployments.createFixture(async (hh) => {
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
        DAI = contracts_1.externalAddressRegistry.forNetwork(await getNetwork()).DAI;
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
        const deployment = await deployments.deploy("ReaperVaultStrategy", {
            from: deployer,
            args: [],
        });
        const deployerSigner = await xhre.ethers.getSigner(deployer);
        reaperStrategy = typechain_1.ReaperVaultStrategy__factory.connect(
            deployment.address,
            deployerSigner
        );
        await reaperStrategy.initialize(assetAllocator.address, roles.address);
        const daiHolder = "0xccd19310e8722e7095914febd4d0c0828fe74675";
        await hardhat_1.default.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [daiHolder],
        });
        const quartetHolder = await xhre.ethers.getSigner(daiHolder);
        dai = typechain_1.ERC20__factory.connect(DAI, quartetHolder);
        daiBalance = await dai.balanceOf(daiHolder);
        await dai.transfer(treasury.address, daiBalance);
        await allocationCalculator.setAllocation(DAI, [reaperStrategy.address], [100000]);
        await farmer.setLimit(DAI, 100000, 0, 0);
        await reaperStrategy.addVault(REAPER_DAI_VAULT);
    });
    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        const unnamedAccounts = await getUnnamedAccounts();
        deployer = namedAccounts.deployer;
        randomAddress = unnamedAccounts[0];
        await deploy();
    });
    it("Treasury should hold DAI", async function () {
        (0, chai_1.expect)(await dai.balanceOf(treasury.address)).to.not.eq(0);
    });
    it("Should return the vault for token", async function () {
        (0, chai_1.expect)(await reaperStrategy.tokenVault(DAI)).to.eq(REAPER_DAI_VAULT);
    });
    it("Should allocate and deposit", async function () {
        await farmer.rebalance(DAI);
        (0, chai_1.expect)(await reaperStrategy.deposited(DAI)).to.eq(daiBalance);
        (0, chai_1.expect)(await reaperStrategy.balance(DAI)).to.be.closeTo(
            daiBalance,
            daiBalance.div(100)
        );
        (0, chai_1.expect)(await dai.balanceOf(reaperStrategy.address)).to.eq(0);
    });
    it.skip("Should collect profits", async function () {
        await farmer.rebalance(DAI);
        const treasuryDaiBal = await dai.balanceOf(treasury.address);
        await dai.approve(assetAllocator.address, daiBalance);
        // probably need to add an harvest call on the reaper vault strategy
        await xhre.ethers.provider.send("evm_increaseTime", [3600]);
        await xhre.ethers.provider.send("evm_mine", []);
        await assetAllocator.collectProfits(DAI);
        (0, chai_1.expect)(await dai.balanceOf(treasury.address)).to.be.gt(
            treasuryDaiBal
        );
    });
    it("Should return deposit to treasury", async function () {
        await farmer.rebalance(DAI);
        const deposited = await reaperStrategy.deposited(DAI);
        await xhre.ethers.provider.send("evm_increaseTime", [3600]);
        await xhre.ethers.provider.send("evm_mine", []);
        await farmer.setLimit(DAI, 0, 0, 0);
        await farmer.rebalance(DAI);
        (0, chai_1.expect)(await dai.balanceOf(reaperStrategy.address)).to.be.closeTo(
            ethers_1.BigNumber.from("0"),
            1e7
        );
        (0, chai_1.expect)(await reaperStrategy.balance(DAI)).to.be.closeTo(
            ethers_1.BigNumber.from("0"),
            1e7
        );
        (0, chai_1.expect)(await dai.balanceOf(assetAllocator.address)).to.eq(0);
        (0, chai_1.expect)(await dai.balanceOf(farmer.address)).to.eq(0);
        (0, chai_1.expect)(await dai.balanceOf(treasury.address)).to.gte(
            deposited.sub(deposited.div(100))
        );
    });
    it("Should exit all farm and put funds in the strat", async function () {
        await farmer.rebalance(DAI);
        await xhre.ethers.provider.send("evm_increaseTime", [3600]);
        await xhre.ethers.provider.send("evm_mine", []);
        await reaperStrategy.exit(DAI);
        (0, chai_1.expect)(await dai.balanceOf(reaperStrategy.address)).to.be.closeTo(
            daiBalance,
            daiBalance.div(100)
        );
        (0, chai_1.expect)(await reaperStrategy.balance(DAI)).to.be.closeTo(
            daiBalance,
            daiBalance.div(100)
        );
        (0, chai_1.expect)(await reaperStrategy.deposited(DAI)).to.closeTo(
            ethers_1.BigNumber.from("0"),
            1e7
        );
    });
    it("Should send funds in contract to DAO", async function () {
        const mintAmount = (0, utils_1.parseEther)("1");
        const tokenFactory = await smock_1.smock.mock("MockToken");
        const token = await tokenFactory.deploy(8);
        await token.mint(reaperStrategy.address, mintAmount);
        await reaperStrategy.extractToDAO(token.address);
        (0, chai_1.expect)(await token.balanceOf(await roles.DAO_ADDRESS())).to.eq(
            mintAmount
        );
    });
    it("Should pause deploy", async function () {
        await reaperStrategy.pause();
        await (0, chai_1.expect)(farmer.rebalance(DAI)).to.be.revertedWith(
            errors_1.PAUSABLE_PAUSED
        );
    });
    it("Should unpause deploy", async function () {
        await reaperStrategy.pause();
        await reaperStrategy.unPause();
        await (0, chai_1.expect)(farmer.rebalance(DAI)).to.not.be.reverted;
    });
    describe("permissions", async function () {
        let user;
        let mcsUser;
        beforeEach(async () => {
            user = await xhre.ethers.getSigner(randomAddress);
            mcsUser = reaperStrategy.connect(user);
        });
        it("Should only let allocator call withdrawTo", async function () {
            await (0, chai_1.expect)(
                mcsUser.withdrawTo(dai.address, 100, user.address)
            ).to.be.revertedWith(errors_1.STRATEGY_CALLER_IS_NOT_ALLOCATOR);
        });
        it("Should only let allocator call emergencyWithdrawTo", async function () {
            await (0, chai_1.expect)(
                mcsUser.emergencyWithdrawTo(dai.address, user.address)
            ).to.be.revertedWith(errors_1.STRATEGY_CALLER_IS_NOT_ALLOCATOR);
        });
        it("Should only let allocator call collectProfits", async function () {
            await (0, chai_1.expect)(
                mcsUser.collectProfits(dai.address, user.address)
            ).to.be.revertedWith(errors_1.STRATEGY_CALLER_IS_NOT_ALLOCATOR);
        });
        it("Should only let allocator call collectRewards", async function () {
            await (0, chai_1.expect)(
                mcsUser.collectRewards(dai.address, user.address)
            ).to.be.revertedWith(errors_1.STRATEGY_CALLER_IS_NOT_ALLOCATOR);
        });
        it("Should only let strategist call exit", async function () {
            await (0, chai_1.expect)(mcsUser.exit(dai.address)).to.be.revertedWith(
                errors_1.ROLES_CALLER_IS_NOT_STRATEGIST
            );
        });
        it("Should only let strategist call extractToDao", async function () {
            await (0, chai_1.expect)(
                mcsUser.extractToDAO(dai.address)
            ).to.be.revertedWith(errors_1.ROLES_CALLER_IS_NOT_STRATEGIST);
        });
        it("Should only let strategist update PID", async function () {
            await (0, chai_1.expect)(mcsUser.addVault(dai.address)).to.be.revertedWith(
                errors_1.ROLES_CALLER_IS_NOT_STRATEGIST
            );
        });
    });
});
