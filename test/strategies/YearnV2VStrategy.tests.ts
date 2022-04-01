import { smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import hre from "hardhat";

import { DAI_DID } from "../../deploy/00_deployDai";
import { ASSET_ALLOCATOR_DID } from "../../deploy/30_deployAssetAllocator";
import { ARFV_TOKEN_DID } from "../../deploy/31_deployARFVToken";
import { EXODIA_ROLES_DID } from "../../deploy/38_deployExodiaRoles";
import { FARMER_DID } from "../../deploy/41_deployFarmer";
import { IExtendedHRE } from "../../packages/HardhatRegistryExtension/ExtendedHRE";
import { externalAddressRegistry } from "../../packages/sdk/contracts";
import { IExodiaContractsRegistry } from "../../packages/sdk/contracts/exodiaContracts";
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
    YearnV2Strategy,
    YearnV2Strategy__factory,
} from "../../packages/sdk/typechain";
import "../chai-setup";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, getUnnamedAccounts, getNetwork } = xhre;

const YEARN_DAI_VAULT = "0x637ec617c86d24e421328e6caea1d92114892439";

describe("YearnV2Strategy", function () {
    let deployer: string;
    let randomAddress: string;
    let treasury: OlympusTreasury;
    let exod: OlympusERC20Token;
    let DAI: string;
    let dai: ERC20;
    let daiBalance: BigNumber;
    let assetAllocator: AssetAllocator;
    let allocationCalculator: AllocationCalculator;
    let yearnStrategy: YearnV2Strategy;
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

        const deployment = await deployments.deploy("YearnV2Strategy", {
            from: deployer,
            args: [],
        });
        const deployerSigner = await xhre.ethers.getSigner(deployer);
        yearnStrategy = YearnV2Strategy__factory.connect(
            deployment.address,
            deployerSigner
        );
        await yearnStrategy.initialize(assetAllocator.address, roles.address);

        const daiHolder = "0xccd19310e8722e7095914febd4d0c0828fe74675";
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
            [yearnStrategy.address],
            [100_000]
        );
        await farmer.setLimit(DAI, 100_000, 0, 0);
        await yearnStrategy.addVault(YEARN_DAI_VAULT);
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
        expect(await yearnStrategy.tokenVault(DAI)).to.eq(YEARN_DAI_VAULT);
    });

    it("Should allocate and deposit", async function () {
        await farmer.rebalance(DAI);
        expect(await yearnStrategy.deposited(DAI)).to.eq(daiBalance);
        expect(await yearnStrategy.balance(DAI)).to.be.closeTo(
            daiBalance,
            daiBalance.div(100) as any
        );
        expect(await dai.balanceOf(yearnStrategy.address)).to.eq(0);
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
        const deposited = await yearnStrategy.deposited(DAI);
        await xhre.ethers.provider.send("evm_increaseTime", [3600]);
        await xhre.ethers.provider.send("evm_mine", []);
        await farmer.setLimit(DAI, 0, 0, 0);
        await farmer.rebalance(DAI);
        expect(await dai.balanceOf(yearnStrategy.address)).to.be.closeTo(
            BigNumber.from("0"),
            1e7
        );
        expect(await yearnStrategy.balance(DAI)).to.be.closeTo(BigNumber.from("0"), 1e7);
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
        await yearnStrategy.exit(DAI);
        expect(await dai.balanceOf(yearnStrategy.address)).to.be.closeTo(
            daiBalance,
            daiBalance.div(100) as any
        );
        expect(await yearnStrategy.balance(DAI)).to.be.closeTo(
            daiBalance,
            daiBalance.div(100) as any
        );
        expect(await yearnStrategy.deposited(DAI)).to.closeTo(BigNumber.from("0"), 1e7);
    });

    it("Should send funds in contract to DAO", async function () {
        const mintAmount = parseEther("1");
        const tokenFactory = await smock.mock<MockToken__factory>("MockToken");
        const token = await tokenFactory.deploy(8);
        await token.mint(yearnStrategy.address, mintAmount);
        await yearnStrategy.extractToDAO(token.address);
        expect(await token.balanceOf(await roles.DAO_ADDRESS())).to.eq(mintAmount);
    });

    describe("permissions", async function () {
        let user: SignerWithAddress;
        let mcsUser: YearnV2Strategy;
        const CALLER_IS_NOT_ALLOCATOR = "Strategy: caller is not allocator";
        const CALLER_IS_NOT_STRATEGIST = "caller is not a strategist";

        beforeEach(async () => {
            user = await xhre.ethers.getSigner(randomAddress);
            mcsUser = yearnStrategy.connect(user);
        });

        it("Should only let allocator call withdrawTo", async function () {
            await expect(
                mcsUser.withdrawTo(dai.address, 100, user.address)
            ).to.be.revertedWith(CALLER_IS_NOT_ALLOCATOR);
        });

        it("Should only let allocator call emergencyWithdrawTo", async function () {
            await expect(
                mcsUser.emergencyWithdrawTo(dai.address, user.address)
            ).to.be.revertedWith(CALLER_IS_NOT_ALLOCATOR);
        });

        it("Should only let allocator call collectProfits", async function () {
            await expect(
                mcsUser.collectProfits(dai.address, user.address)
            ).to.be.revertedWith(CALLER_IS_NOT_ALLOCATOR);
        });

        it("Should only let allocator call collectRewards", async function () {
            await expect(
                mcsUser.collectRewards(dai.address, user.address)
            ).to.be.revertedWith(CALLER_IS_NOT_ALLOCATOR);
        });

        it("Should only let strategist call exit", async function () {
            await expect(mcsUser.exit(dai.address)).to.be.revertedWith(
                CALLER_IS_NOT_STRATEGIST
            );
        });

        it("Should only let strategist call extractToDao", async function () {
            await expect(mcsUser.extractToDAO(dai.address)).to.be.revertedWith(
                CALLER_IS_NOT_STRATEGIST
            );
        });

        it("Should only let strategist update PID", async function () {
            await expect(mcsUser.addVault(dai.address)).to.be.revertedWith(
                CALLER_IS_NOT_STRATEGIST
            );
        });
    });
});
