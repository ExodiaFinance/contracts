import { smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import hre from "hardhat";

import { DAI_DID } from "../../../deploy/00_deployDai";
import { ASSET_ALLOCATOR_DID } from "../../../deploy/30_deployAssetAllocator";
import { ARFV_TOKEN_DID } from "../../../deploy/31_deployARFVToken";
import { EXODIA_ROLES_DID } from "../../../deploy/38_deployExodiaRoles";
import { FARMER_DID } from "../../../deploy/41_deployFarmer";
import { IExtendedHRE } from "../../../packages/HardhatRegistryExtension/ExtendedHRE";
import { externalAddressRegistry } from "../../../packages/sdk/contracts";
import { IExodiaContractsRegistry } from "../../../packages/sdk/contracts/exodiaContracts";
import {
    AllocationCalculator,
    AllocationCalculator__factory,
    AssetAllocator,
    AssetAllocator__factory,
    ERC20,
    ERC20__factory,
    ExodiaRoles,
    ExodiaRoles__factory,
    Farmer,
    Farmer__factory,
    MockToken__factory,
    OlympusERC20Token,
    OlympusERC20Token__factory,
    OlympusTreasury,
    OlympusTreasury__factory,
    ReaperVaultStrategy,
    ReaperVaultStrategy__factory,
    StrategyWhitelist__factory,
} from "../../../packages/sdk/typechain";
import "../../chai-setup";
import {
    PAUSABLE_PAUSED,
    ROLES_CALLER_IS_NOT_STRATEGIST,
    STRATEGY_CALLER_IS_NOT_ALLOCATOR,
} from "../../errors";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, getUnnamedAccounts, getNetwork } = xhre;

const REAPER_DAI_VAULT = "0x85ea7Ee24204B3DFEEA5d28b3Fd791D8fD1409b8";

describe("ReaperVault", function () {
    let deployer: string;
    let randomAddress: string;
    let treasury: OlympusTreasury;
    let exod: OlympusERC20Token;
    let DAI: string;
    let dai: ERC20;
    let daiBalance: BigNumber;
    let assetAllocator: AssetAllocator;
    let allocationCalculator: AllocationCalculator;
    let reaperStrategy: ReaperVaultStrategy;
    let roles: ExodiaRoles;
    let farmer: Farmer;

    const deploy = deployments.createFixture(async (hh) => {
        await deployments.fixture([
            ASSET_ALLOCATOR_DID,
            DAI_DID,
            ARFV_TOKEN_DID,
            EXODIA_ROLES_DID,
            FARMER_DID,
        ]);
        const treasuryDeployment = await get<OlympusTreasury__factory>("OlympusTreasury");
        treasury = treasuryDeployment.contract;
        const exodDeployment = await get<OlympusERC20Token__factory>("OlympusERC20Token");
        exod = exodDeployment.contract;
        DAI = externalAddressRegistry.forNetwork(await getNetwork()).DAI;
        const assetAllocateDeployment = await get<AssetAllocator__factory>(
            "AssetAllocator"
        );
        assetAllocator = assetAllocateDeployment.contract;
        await assetAllocator.addMachine(deployer);
        const allocCalcDeployment = await get<AllocationCalculator__factory>(
            "AllocationCalculator"
        );
        allocationCalculator = allocCalcDeployment.contract;
        const farmerDeployment = await get<Farmer__factory>("Farmer");
        farmer = farmerDeployment.contract;
        const rolesDeployment = await get<ExodiaRoles__factory>("ExodiaRoles");
        roles = rolesDeployment.contract;
        await roles.addStrategist(deployer);

        const deployment = await deployments.deploy("ReaperVaultStrategy", {
            from: deployer,
            args: [],
        });
        const { contract: whitelist } = await get<StrategyWhitelist__factory>(
            "StrategyWhitelist"
        );
        await whitelist.add(deployment.address);
        const deployerSigner = await xhre.ethers.getSigner(deployer);
        reaperStrategy = ReaperVaultStrategy__factory.connect(
            deployment.address,
            deployerSigner
        );
        await reaperStrategy.initialize(assetAllocator.address, roles.address);

        const daiHolder = "0x7182a1b9cf88e87b83e936d3553c91f9e7bebdd7";
        await deployerSigner.sendTransaction({ value: parseEther("1"), to: daiHolder });
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [daiHolder],
        });
        const quartetHolder = await xhre.ethers.getSigner(daiHolder);
        dai = ERC20__factory.connect(DAI, quartetHolder);
        daiBalance = await dai.balanceOf(daiHolder);
        await dai.transfer(treasury.address, daiBalance);
        await allocationCalculator.setAllocation(
            DAI,
            [reaperStrategy.address],
            [100_000]
        );
        await farmer.setLimit(DAI, 100_000, 0, 0);
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
        expect(await dai.balanceOf(treasury.address)).to.not.eq(0);
    });

    it("Should return the vault for token", async function () {
        expect(await reaperStrategy.tokenVault(DAI)).to.eq(REAPER_DAI_VAULT);
    });

    it("Should allocate and deposit", async function () {
        await farmer.rebalance(DAI);
        expect(await reaperStrategy.deposited(DAI)).to.eq(daiBalance);
        expect(await reaperStrategy.callStatic.balance(DAI)).to.be.closeTo(
            daiBalance,
            daiBalance.div(100) as any
        );
        expect(await dai.balanceOf(reaperStrategy.address)).to.eq(0);
    });

    it.skip("Should collect profits", async function () {
        await farmer.rebalance(DAI);
        const treasuryDaiBal = await dai.balanceOf(treasury.address);
        await dai.approve(assetAllocator.address, daiBalance);
        // probably need to add an harvest call on the reaper vault strategy
        await xhre.ethers.provider.send("evm_increaseTime", [3600]);
        await xhre.ethers.provider.send("evm_mine", []);
        await assetAllocator.collectProfits(DAI);
        expect(await dai.balanceOf(treasury.address)).to.be.gt(treasuryDaiBal);
    });

    it("Should return deposit to treasury", async function () {
        await farmer.rebalance(DAI);
        const deposited = await reaperStrategy.deposited(DAI);
        await xhre.ethers.provider.send("evm_increaseTime", [3600]);
        await xhre.ethers.provider.send("evm_mine", []);
        await farmer.setLimit(DAI, 0, 0, 0);
        await farmer.rebalance(DAI);
        expect(await dai.balanceOf(reaperStrategy.address)).to.be.closeTo(
            BigNumber.from("0"),
            1e7
        );
        expect(await reaperStrategy.callStatic.balance(DAI)).to.be.closeTo(
            BigNumber.from("0"),
            1e7
        );
        expect(await dai.balanceOf(assetAllocator.address)).to.eq(0);
        expect(await dai.balanceOf(farmer.address)).to.eq(0);
        expect(await dai.balanceOf(treasury.address)).to.gte(
            deposited.sub(deposited.div(100))
        );
    });

    it("Should exit all farm and put funds in the strat", async function () {
        await farmer.rebalance(DAI);
        await xhre.ethers.provider.send("evm_increaseTime", [3600]);
        await xhre.ethers.provider.send("evm_mine", []);
        await reaperStrategy.exit(DAI);
        expect(await dai.balanceOf(reaperStrategy.address)).to.be.closeTo(
            daiBalance,
            daiBalance.div(100) as any
        );
        expect(await reaperStrategy.callStatic.balance(DAI)).to.be.closeTo(
            daiBalance,
            daiBalance.div(100) as any
        );
        expect(await reaperStrategy.deposited(DAI)).to.closeTo(BigNumber.from("0"), 1e7);
    });

    it("Should send funds in contract to DAO", async function () {
        const mintAmount = parseEther("1");
        const tokenFactory = await smock.mock<MockToken__factory>("MockToken");
        const token = await tokenFactory.deploy(8);
        await token.mint(reaperStrategy.address, mintAmount);
        await reaperStrategy.extractToDAO(token.address);
        expect(await token.balanceOf(await roles.DAO_ADDRESS())).to.eq(mintAmount);
    });

    it("Should pause deploy", async function () {
        await reaperStrategy.pause();
        await expect(farmer.rebalance(DAI)).to.be.revertedWith(PAUSABLE_PAUSED);
    });

    it("Should unpause deploy", async function () {
        await reaperStrategy.pause();
        await reaperStrategy.unPause();
        await expect(farmer.rebalance(DAI)).to.not.be.reverted;
    });

    describe("permissions", async function () {
        let user: SignerWithAddress;
        let mcsUser: ReaperVaultStrategy;

        beforeEach(async () => {
            user = await xhre.ethers.getSigner(randomAddress);
            mcsUser = reaperStrategy.connect(user);
        });

        it("Should only let allocator call withdrawTo", async function () {
            await expect(
                mcsUser.withdrawTo(dai.address, 100, user.address)
            ).to.be.revertedWith(STRATEGY_CALLER_IS_NOT_ALLOCATOR);
        });

        it("Should only let allocator call emergencyWithdrawTo", async function () {
            await expect(
                mcsUser.emergencyWithdrawTo(dai.address, user.address)
            ).to.be.revertedWith(STRATEGY_CALLER_IS_NOT_ALLOCATOR);
        });

        it("Should only let allocator call collectProfits", async function () {
            await expect(
                mcsUser.collectProfits(dai.address, user.address)
            ).to.be.revertedWith(STRATEGY_CALLER_IS_NOT_ALLOCATOR);
        });

        it("Should only let allocator call collectRewards", async function () {
            await expect(
                mcsUser.collectRewards(dai.address, user.address)
            ).to.be.revertedWith(STRATEGY_CALLER_IS_NOT_ALLOCATOR);
        });

        it("Should only let strategist call exit", async function () {
            await expect(mcsUser.exit(dai.address)).to.be.revertedWith(
                ROLES_CALLER_IS_NOT_STRATEGIST
            );
        });

        it("Should only let strategist call extractToDao", async function () {
            await expect(mcsUser.extractToDAO(dai.address)).to.be.revertedWith(
                ROLES_CALLER_IS_NOT_STRATEGIST
            );
        });

        it("Should only let strategist update PID", async function () {
            await expect(mcsUser.addVault(dai.address)).to.be.revertedWith(
                ROLES_CALLER_IS_NOT_STRATEGIST
            );
        });
    });
});
