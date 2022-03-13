import { MockContract, MockContractFactory, smock } from "@defi-wonderland/smock";
import { expect } from "chai";
import { BigNumber } from "ethers";
import hre from "hardhat";

import { DAI_DID } from "../../deploy/00_deployDai";
import { ASSET_ALLOCATOR_DID } from "../../deploy/30_deployAssetAllocator";
import { ARFV_TOKEN_DID } from "../../deploy/31_deployARFVToken";
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
    let addressRegistry: IExternalContractsRegistry;

    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        const unnamedAccounts = await getUnnamedAccounts();
        deployer = namedAccounts.deployer;
        randomAddress = unnamedAccounts[0];
        await deployments.fixture([ASSET_ALLOCATOR_DID, DAI_DID, ARFV_TOKEN_DID]);
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
        const allocCalcDeployment = await get<AllocationCalculator__factory>(
            "AllocationCalculator"
        );
        allocationCalculator = allocCalcDeployment.contract;

        addressRegistry = await externalAddressRegistry.forNetwork(await getNetwork());
        const { BEETS_MASTERCHEF, BEETS, FBEETS_BAR } = addressRegistry;
        const deployment = await deployments.deploy("MasterChefStrategy", {
            from: deployer,
            args: [BEETS_MASTERCHEF, BEETS, assetAllocator.address],
        });
        const deployerSigner = await xhre.ethers.getSigner(deployer);
        masterChefStrat = MasterChefStrategy__factory.connect(
            deployment.address,
            deployerSigner
        );
        beets = ERC20__factory.connect(BEETS, deployerSigner);
        const quartetHolderAddress = "0xf3A602d30dcB723A74a0198313a7551FEacA7DAc";
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
        await masterChefStrat.setPid(FBEETS_BAR, 22);
        await masterChefStrat.setPid(A_LATE_QUARTET, 17);
    });

    it("Treasury should hold BPT-QUARTET", async function () {
        expect(await bptQuartet.balanceOf(treasury.address)).to.not.eq(0);
    });

    it("Should allocate and deposit", async function () {
        await bptQuartet.approve(assetAllocator.address, bptBalance);
        await assetAllocator.rebalance(A_LATE_QUARTET, bptBalance);
        expect(await masterChefStrat.deposited(A_LATE_QUARTET)).to.eq(bptBalance);
        expect(await masterChefStrat.balance(A_LATE_QUARTET)).to.eq(bptBalance);
    });

    it("Should collect rewards", async function () {
        const beetsBal = await beets.balanceOf(treasury.address);
        await bptQuartet.approve(assetAllocator.address, bptBalance);
        await assetAllocator.rebalance(A_LATE_QUARTET, bptBalance);
        await xhre.ethers.provider.send("evm_increaseTime", [3600]);
        await xhre.ethers.provider.send("evm_mine", []);
        await masterChefStrat.collectRewards(A_LATE_QUARTET);
        expect(await beets.balanceOf(treasury.address)).to.be.gt(beetsBal);
    });

    it("Should return deposit to treasury", async function () {
        const beetsBal = await beets.balanceOf(treasury.address);
        await assetAllocator.reallocate(A_LATE_QUARTET);
        const deposited = await masterChefStrat.deposited(A_LATE_QUARTET);
        await assetAllocator.setAllocation(
            A_LATE_QUARTET,
            [masterChefStrat.address],
            [0]
        );
        await xhre.ethers.provider.send("evm_increaseTime", [3600]);
        await xhre.ethers.provider.send("evm_mine", []);
        await assetAllocator.reallocate(A_LATE_QUARTET);
        expect(await bptQuartet.balanceOf(masterChefStrat.address)).to.eq(0);
        expect(await bptQuartet.balanceOf(assetAllocator.address)).to.eq(0);
        expect(await bptQuartet.balanceOf(treasury.address)).to.eq(deposited);
        expect(await beets.balanceOf(treasury.address)).to.be.gt(beetsBal);
    });

    it("Should only let strategist update PID", async function () {
        const signer = await xhre.ethers.getSigner(randomAddress);
        const mcs = MasterChefStrategy__factory.connect(masterChefStrat.address, signer);
        expect(mcs.setPid(bptQuartet.address, 17)).to.be.revertedWith(
            "caller is not a strategist"
        );
    });

    it("Should only let policy call withdrawToTreasury", async function () {
        const signer = await xhre.ethers.getSigner(randomAddress);
        const mcs = MasterChefStrategy__factory.connect(masterChefStrat.address, signer);
        expect(mcs.setPid(bptQuartet.address, 17)).to.be.revertedWith(
            "caller is not policy"
        );
    });
});
