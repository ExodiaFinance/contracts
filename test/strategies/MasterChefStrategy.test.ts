import { MockContract, MockContractFactory, smock } from "@defi-wonderland/smock";
import { expect } from "chai";
import { BigNumber } from "ethers";
import hre from "hardhat";

import { DAI_DID } from "../../deploy/00_deployDai";
import { ASSET_ALLOCATOR_DID } from "../../deploy/30_deployAssetAllocator";
import { ARFV_TOKEN_DID } from "../../deploy/31_deployARFVToken";
import { externalAddressRegistry } from "../../src/contracts";
import {
    IExodiaContractsRegistry,
    IExternalContractsRegistry,
} from "../../src/contracts/exodiaContracts";
import { IExtendedHRE } from "../../src/HardhatRegistryExtension/ExtendedHRE";
import {
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
} from "../../typechain";
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
    let bptBalance: BigNumber;
    let assetAllocator: AssetAllocator;
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
        const quartetHolderAddress = "0x6d3133c5ecbbf44fdf135abaeb5eae2ab3a1e894";
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [quartetHolderAddress],
        });
        const quartetHolder = await xhre.ethers.getSigner(quartetHolderAddress);
        bptQuartet = ERC20__factory.connect(A_LATE_QUARTET, quartetHolder);
        bptBalance = await bptQuartet.balanceOf(quartetHolderAddress);
        await bptQuartet.transfer(treasury.address, bptBalance);
        await assetAllocator.setAllocation(
            A_LATE_QUARTET,
            [masterChefStrat.address],
            [100_000]
        );
        await masterChefStrat.setPid(bptQuartet.address, 31);
    });

    it("Treasury should hold BPT-QUARTET", async function () {
        expect(await bptQuartet.balanceOf(treasury.address)).to.not.eq(0);
    });

    it("Should allocate and deposit", async function () {
        await assetAllocator.reallocate(bptQuartet.address);
        expect(await masterChefStrat.deposited(bptQuartet.address)).to.eq(bptBalance);
    });
});
