import { MockContract, MockContractFactory, smock } from "@defi-wonderland/smock";
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
import {
    IExodiaContractsRegistry,
    IExternalContractsRegistry,
} from "../../packages/sdk/contracts/exodiaContracts";
import {
    AllocationCalculator,
    AllocationCalculator__factory,
    AssetAllocator,
    AssetAllocator__factory,
    DAI,
    DAI__factory,
    ERC20,
    ERC20__factory,
    ExodiaRoles,
    ExodiaRoles__factory,
    Farmer,
    Farmer__factory,
    MasterChefStrategy,
    MasterChefStrategy__factory,
    OlympusERC20Token,
    OlympusERC20Token__factory,
    OlympusTreasury,
    OlympusTreasury__factory,
} from "../../packages/sdk/typechain";
import "../chai-setup";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, getUnnamedAccounts, getNetwork } = xhre;

const A_LATE_QUARTET = "0xf3A602d30dcB723A74a0198313a7551FEacA7DAc";

describe("MasterChefStrategy", function () {
    let deployer: string;
    let randomAddress: string;
    let treasury: OlympusTreasury;
    let exod: OlympusERC20Token;
    let dai: DAI;
    let bptQuartet: ERC20;
    let beets: ERC20;
    let bptBalance: BigNumber;
    let assetAllocator: AssetAllocator;
    let allocationCalculator: AllocationCalculator;
    let masterChefStrat: MasterChefStrategy;
    let roles: ExodiaRoles;
    let addressRegistry: IExternalContractsRegistry;
    let farmer: Farmer;

    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        const unnamedAccounts = await getUnnamedAccounts();
        deployer = namedAccounts.deployer;
        randomAddress = unnamedAccounts[0];
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
        const daiDeployment = await get<DAI__factory>("DAI");
        dai = daiDeployment.contract;
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

        addressRegistry = await externalAddressRegistry.forNetwork(await getNetwork());
        const { BEETS_MASTERCHEF, BEETS } = addressRegistry;
        const deployment = await deployments.deploy("MasterChefStrategy", {
            from: deployer,
            args: [],
        });
        const deployerSigner = await xhre.ethers.getSigner(deployer);
        masterChefStrat = MasterChefStrategy__factory.connect(
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
        beets = ERC20__factory.connect(BEETS, deployerSigner);
        const quartetHolderAddress = "0x6e7de22562a8026da3fa2e2b174a89931822bb1b";
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [quartetHolderAddress],
        });
        const quartetHolder = await xhre.ethers.getSigner(quartetHolderAddress);
        bptQuartet = ERC20__factory.connect(A_LATE_QUARTET, quartetHolder);
        bptBalance = await bptQuartet.balanceOf(quartetHolderAddress);
        await bptQuartet.transfer(treasury.address, bptBalance);
        await allocationCalculator.setAllocation(
            A_LATE_QUARTET,
            [masterChefStrat.address],
            [100_000]
        );
        const { FBEETS_BAR } = addressRegistry;
        await masterChefStrat.setPid(FBEETS_BAR, 22);
        await masterChefStrat.setPid(A_LATE_QUARTET, 17);
        await farmer.setLimit(A_LATE_QUARTET, 100_000, 0, 0);
    });

    it("Treasury should hold BPT-QUARTET", async function () {
        expect(await bptQuartet.balanceOf(treasury.address)).to.not.eq(0);
    });

    it("Should set pid", async function () {
        expect(await masterChefStrat.getPid(A_LATE_QUARTET)).to.eq(17);
    });

    it("Should revert if PID does not match token", async function () {
        await expect(masterChefStrat.setPid(deployer, 17)).to.be.revertedWith(
            "MCS: PID does not match token"
        );
    });

    it("Should allocate and deposit", async function () {
        await farmer.rebalance(A_LATE_QUARTET);
        expect(await masterChefStrat.deposited(A_LATE_QUARTET)).to.eq(bptBalance);
        expect(await masterChefStrat.balance(A_LATE_QUARTET)).to.eq(bptBalance);
        expect(await bptQuartet.balanceOf(masterChefStrat.address)).to.eq(0);
    });

    it("Should collect rewards", async function () {
        const beetsBal = await beets.balanceOf(treasury.address);
        await bptQuartet.approve(assetAllocator.address, bptBalance);
        await farmer.rebalance(A_LATE_QUARTET);
        await xhre.ethers.provider.send("evm_increaseTime", [3600]);
        await xhre.ethers.provider.send("evm_mine", []);
        await farmer.harvest(A_LATE_QUARTET);
        expect(await beets.balanceOf(treasury.address)).to.be.gt(beetsBal);
    });

    it("Should return deposit to treasury", async function () {
        const beetsBal = await beets.balanceOf(treasury.address);
        await farmer.rebalance(A_LATE_QUARTET);
        const deposited = await masterChefStrat.deposited(A_LATE_QUARTET);
        await xhre.ethers.provider.send("evm_increaseTime", [3600]);
        await xhre.ethers.provider.send("evm_mine", []);
        await farmer.setLimit(A_LATE_QUARTET, 0, 0, 0);
        await farmer.rebalance(A_LATE_QUARTET);
        expect(await bptQuartet.balanceOf(masterChefStrat.address)).to.eq(0);
        expect(await bptQuartet.balanceOf(assetAllocator.address)).to.eq(0);
        expect(await bptQuartet.balanceOf(farmer.address)).to.eq(0);
        expect(await bptQuartet.balanceOf(treasury.address)).to.eq(deposited);
        expect(await beets.balanceOf(treasury.address)).to.be.gt(beetsBal);
        expect(await masterChefStrat.deposited(A_LATE_QUARTET)).to.eq(0);
        expect(await masterChefStrat.balance(A_LATE_QUARTET)).to.eq(0);
    });

    it("Should exit farm and put funds in the strat (with harvest)", async function () {
        await farmer.rebalance(A_LATE_QUARTET);
        await xhre.ethers.provider.send("evm_increaseTime", [3600]);
        await xhre.ethers.provider.send("evm_mine", []);
        await masterChefStrat.exit(A_LATE_QUARTET);
        expect(await beets.balanceOf(masterChefStrat.address)).to.be.gt(0);
        expect(await bptQuartet.balanceOf(masterChefStrat.address)).to.be.eq(bptBalance);
    });

    it("Should exit the strat and put funds in the strat (no harvest)", async function () {
        await farmer.rebalance(A_LATE_QUARTET);
        await xhre.ethers.provider.send("evm_increaseTime", [3600]);
        await xhre.ethers.provider.send("evm_mine", []);
        await masterChefStrat.emergencyExit(A_LATE_QUARTET);
        expect(await beets.balanceOf(masterChefStrat.address)).to.be.eq(0);
        expect(await bptQuartet.balanceOf(masterChefStrat.address)).to.be.eq(bptBalance);
        expect(await masterChefStrat.deposited(A_LATE_QUARTET)).to.eq(0);
        expect(await masterChefStrat.balance(A_LATE_QUARTET)).to.eq(bptBalance);
    });

    it("Should send funds in contract to DAO", async function () {
        const mintAmount = parseEther("1");
        await dai.mint(masterChefStrat.address, mintAmount);
        await masterChefStrat.extractToDAO(dai.address);
        expect(await dai.balanceOf(await roles.DAO_ADDRESS())).to.eq(mintAmount);
    });

    describe("permissions", async function () {
        let user: SignerWithAddress;
        let mcsUser: MasterChefStrategy;
        const CALLER_IS_NOT_ALLOCATOR = "Strategy: caller is not allocator";
        const CALLER_IS_NOT_STRATEGIST = "caller is not a strategist";

        beforeEach(async () => {
            user = await xhre.ethers.getSigner(randomAddress);
            mcsUser = masterChefStrat.connect(user);
        });

        it("Should only let allocator call withdrawTo", async function () {
            await expect(
                mcsUser.withdrawTo(bptQuartet.address, 100, user.address)
            ).to.be.revertedWith(CALLER_IS_NOT_ALLOCATOR);
        });

        it("Should only let allocator call emergencyWithdrawTo", async function () {
            await expect(
                mcsUser.emergencyWithdrawTo(bptQuartet.address, user.address)
            ).to.be.revertedWith(CALLER_IS_NOT_ALLOCATOR);
        });

        it("Should only let allocator call collectProfits", async function () {
            await expect(
                mcsUser.collectProfits(bptQuartet.address, user.address)
            ).to.be.revertedWith(CALLER_IS_NOT_ALLOCATOR);
        });

        it("Should only let allocator call collectRewards", async function () {
            await expect(
                mcsUser.collectRewards(bptQuartet.address, user.address)
            ).to.be.revertedWith(CALLER_IS_NOT_ALLOCATOR);
        });

        it("Should only let strategist call exit", async function () {
            await expect(mcsUser.exit(bptQuartet.address)).to.be.revertedWith(
                CALLER_IS_NOT_STRATEGIST
            );
        });

        it("Should only let strategist call emergencyExit", async function () {
            await expect(mcsUser.emergencyExit(bptQuartet.address)).to.be.revertedWith(
                CALLER_IS_NOT_STRATEGIST
            );
        });

        it("Should only let strategist call extractToDao", async function () {
            await expect(mcsUser.extractToDAO(bptQuartet.address)).to.be.revertedWith(
                CALLER_IS_NOT_STRATEGIST
            );
        });

        it("Should only let strategist update PID", async function () {
            await expect(mcsUser.setPid(bptQuartet.address, 17)).to.be.revertedWith(
                CALLER_IS_NOT_STRATEGIST
            );
        });
    });
});
