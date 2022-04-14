import { smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import hre, { ethers } from "hardhat";

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
    TarotVaultStrategy,
    TarotVaultStrategy__factory,
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

const TAROT_USDC_VAULT = "0x68d211Bc1e66814575d89bBE4F352B4cdbDACDFb";
const USDC_HOLDER = "0x7182a1b9cf88e87b83e936d3553c91f9e7bebdd7";

describe("TarotVault", function () {
    let deployer: string;
    let randomAddress: string;
    let treasury: OlympusTreasury;
    let exod: OlympusERC20Token;
    let USDC: string;
    let usdc: ERC20;
    let usdcBalance: BigNumber;
    let assetAllocator: AssetAllocator;
    let allocationCalculator: AllocationCalculator;
    let tarotStrategy: TarotVaultStrategy;
    let roles: ExodiaRoles;
    let farmer: Farmer;

    const deploy = deployments.createFixture(async (hh) => {
        await deployments.fixture([
            ASSET_ALLOCATOR_DID,
            ARFV_TOKEN_DID,
            EXODIA_ROLES_DID,
            FARMER_DID,
        ]);
        const treasuryDeployment = await get<OlympusTreasury__factory>("OlympusTreasury");
        treasury = treasuryDeployment.contract;
        const exodDeployment = await get<OlympusERC20Token__factory>("OlympusERC20Token");
        exod = exodDeployment.contract;
        USDC = externalAddressRegistry.forNetwork(await getNetwork()).USDC;
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

        const deployment = await deployments.deploy("TarotVaultStrategy", {
            from: deployer,
            args: [],
        });
        const { contract: whitelist } = await get<StrategyWhitelist__factory>(
            "StrategyWhitelist"
        );
        await whitelist.add(deployment.address);
        const deployerSigner = await xhre.ethers.getSigner(deployer);
        tarotStrategy = TarotVaultStrategy__factory.connect(
            deployment.address,
            deployerSigner
        );
        await tarotStrategy.initialize(assetAllocator.address, roles.address);

        await deployerSigner.sendTransaction({ value: parseEther("1"), to: USDC_HOLDER });
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [USDC_HOLDER],
        });
        const quartetHolder = await xhre.ethers.getSigner(USDC_HOLDER);
        usdc = ERC20__factory.connect(USDC, quartetHolder);
        usdcBalance = ethers.utils.parseUnits("10000", 6);
        await usdc.transfer(treasury.address, usdcBalance);
        await allocationCalculator.setAllocation(
            USDC,
            [tarotStrategy.address],
            [100_000]
        );
        await farmer.setLimit(USDC, 100_000, 0, 0);
        await tarotStrategy.addVault(TAROT_USDC_VAULT);
    });

    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        const unnamedAccounts = await getUnnamedAccounts();
        deployer = namedAccounts.deployer;
        randomAddress = unnamedAccounts[0];
        await deploy();
    });

    it("Treasury should hold USDC", async function () {
        expect(await usdc.balanceOf(treasury.address)).to.not.eq(0);
    });

    it("Should return the vault for token", async function () {
        expect(await tarotStrategy.tokenVault(USDC)).to.eq(TAROT_USDC_VAULT);
    });

    it("Should allocate and deposit", async function () {
        await farmer.rebalance(USDC);
        expect(await tarotStrategy.deposited(USDC)).to.eq(usdcBalance);
        expect(await tarotStrategy.callStatic.balance(USDC)).to.be.closeTo(
            usdcBalance,
            usdcBalance.div(100) as any
        );
        expect(await usdc.balanceOf(tarotStrategy.address)).to.eq(0);
    });

    it.skip("Should collect profits", async function () {
        await farmer.rebalance(USDC);
        const treasuryUsdcBal = await usdc.balanceOf(treasury.address);
        await usdc.approve(assetAllocator.address, usdcBalance);
        // probably need to add an harvest call on the tarot vault strategy
        await xhre.ethers.provider.send("evm_increaseTime", [3600]);
        await xhre.ethers.provider.send("evm_mine", []);
        await assetAllocator.collectProfits(USDC);
        expect(await usdc.balanceOf(treasury.address)).to.be.gt(treasuryUsdcBal);
    });

    it("Should return deposit to treasury", async function () {
        await farmer.rebalance(USDC);
        const deposited = await tarotStrategy.deposited(USDC);
        await xhre.ethers.provider.send("evm_increaseTime", [3600]);
        await xhre.ethers.provider.send("evm_mine", []);
        await farmer.setLimit(USDC, 0, 0, 0);
        await farmer.rebalance(USDC);
        expect(await usdc.balanceOf(tarotStrategy.address)).to.be.closeTo(
            BigNumber.from("0"),
            1e7
        );
        expect(await tarotStrategy.callStatic.balance(USDC)).to.be.closeTo(
            BigNumber.from("0"),
            1e7
        );
        expect(await usdc.balanceOf(assetAllocator.address)).to.eq(0);
        expect(await usdc.balanceOf(farmer.address)).to.eq(0);
        expect(await usdc.balanceOf(treasury.address)).to.gte(
            deposited.sub(deposited.div(100))
        );
    });

    it("Should exit all farm and put funds in the strat", async function () {
        await farmer.rebalance(USDC);
        await xhre.ethers.provider.send("evm_increaseTime", [3600]);
        await xhre.ethers.provider.send("evm_mine", []);
        await tarotStrategy.exit(USDC);
        expect(await usdc.balanceOf(tarotStrategy.address)).to.be.closeTo(
            usdcBalance,
            usdcBalance.div(100) as any
        );
        expect(await tarotStrategy.callStatic.balance(USDC)).to.be.closeTo(
            usdcBalance,
            usdcBalance.div(100) as any
        );
        expect(await tarotStrategy.deposited(USDC)).to.closeTo(BigNumber.from("0"), 1e7);
    });

    it("Should send funds in contract to DAO", async function () {
        const mintAmount = parseEther("1");
        const tokenFactory = await smock.mock<MockToken__factory>("MockToken");
        const token = await tokenFactory.deploy(8);
        await token.mint(tarotStrategy.address, mintAmount);
        await tarotStrategy.extractToDAO(token.address);
        expect(await token.balanceOf(await roles.DAO_ADDRESS())).to.eq(mintAmount);
    });

    it("Should pause deploy", async function () {
        await farmer.pause();
        await expect(farmer.rebalance(USDC)).to.be.revertedWith(PAUSABLE_PAUSED);
    });

    it("Should unpause deploy", async function () {
        await farmer.pause();
        await farmer.unPause();
        await expect(farmer.rebalance(USDC)).to.not.be.reverted;
    });

    describe("permissions", async function () {
        let user: SignerWithAddress;
        let mcsUser: TarotVaultStrategy;

        beforeEach(async () => {
            user = await xhre.ethers.getSigner(randomAddress);
            mcsUser = tarotStrategy.connect(user);
        });

        it("Should only let allocator call withdrawTo", async function () {
            await expect(
                mcsUser.withdrawTo(usdc.address, 100, user.address)
            ).to.be.revertedWith(STRATEGY_CALLER_IS_NOT_ALLOCATOR);
        });

        it("Should only let allocator call emergencyWithdrawTo", async function () {
            await expect(
                mcsUser.emergencyWithdrawTo(usdc.address, user.address)
            ).to.be.revertedWith(STRATEGY_CALLER_IS_NOT_ALLOCATOR);
        });

        it("Should only let allocator call collectProfits", async function () {
            await expect(
                mcsUser.collectProfits(usdc.address, user.address)
            ).to.be.revertedWith(STRATEGY_CALLER_IS_NOT_ALLOCATOR);
        });

        it("Should only let allocator call collectRewards", async function () {
            await expect(
                mcsUser.collectRewards(usdc.address, user.address)
            ).to.be.revertedWith(STRATEGY_CALLER_IS_NOT_ALLOCATOR);
        });

        it("Should only let strategist call exit", async function () {
            await expect(mcsUser.exit(usdc.address)).to.be.revertedWith(
                ROLES_CALLER_IS_NOT_STRATEGIST
            );
        });

        it("Should only let strategist call extractToDao", async function () {
            await expect(mcsUser.extractToDAO(usdc.address)).to.be.revertedWith(
                ROLES_CALLER_IS_NOT_STRATEGIST
            );
        });

        it("Should only let strategist update PID", async function () {
            await expect(mcsUser.addVault(usdc.address)).to.be.revertedWith(
                ROLES_CALLER_IS_NOT_STRATEGIST
            );
        });
    });
});
