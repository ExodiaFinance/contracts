import { MockContract, MockContractFactory, smock } from "@defi-wonderland/smock";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import hre from "hardhat";

import { DAI_DID } from "../../deploy/00_deployDai";
import { ASSET_ALLOCATOR_DID } from "../../deploy/30_deployAssetAllocator";
import { ARFV_TOKEN_DID } from "../../deploy/31_deployARFVToken";
import { IExodiaContractsRegistry } from "../../src/contracts/exodiaContracts";
import { IExtendedHRE } from "../../src/HardhatRegistryExtension/ExtendedHRE";
import toggleRights, { MANAGING } from "../../src/subdeploy/toggleRights";
import {
    AllocatedRiskFreeValue,
    AllocatedRiskFreeValue__factory,
    AssetAllocator,
    AssetAllocator__factory,
    DAI,
    DAI__factory,
    MockStrategy,
    MockStrategy__factory,
    OlympusERC20Token,
    OlympusERC20Token__factory,
    OlympusTreasury,
    OlympusTreasury__factory,
} from "../../typechain";
import "../chai-setup";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;

describe("AssetAllocator", function () {
    let deployer: string;
    let randomAddress: string;
    let treasury: OlympusTreasury;
    let exod: OlympusERC20Token;
    let dai: DAI;
    let arfv: AllocatedRiskFreeValue;
    let assetAllocator: AssetAllocator;
    let mockStrategyFactory: MockContractFactory<MockStrategy__factory>;
    let strategy: MockContract<MockStrategy>;
    let mockTokenFactory: MockContractFactory<DAI__factory>;

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
        const arfvDeployment = await get<AllocatedRiskFreeValue__factory>(
            "AllocatedRiskFreeValue"
        );
        arfv = arfvDeployment.contract;
        const assetAllocateDeployment = await get<AssetAllocator__factory>(
            "AssetAllocator"
        );
        assetAllocator = assetAllocateDeployment.contract;
        mockStrategyFactory = await smock.mock<MockStrategy__factory>("MockStrategy");
        strategy = await mockStrategyFactory.deploy(assetAllocator.address);
        mockTokenFactory = await smock.mock<DAI__factory>("DAI");
        await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, deployer);
    });

    it("Should return if asset can be Deposited", async function () {
        await toggleRights(treasury, MANAGING.LIQUIDITYTOKEN, randomAddress);
        expect(await assetAllocator.hasRiskFreeValue(dai.address)).to.be.true;
        expect(await assetAllocator.hasRiskFreeValue(randomAddress)).to.be.true;
        expect(await assetAllocator.hasRiskFreeValue(deployer)).to.be.false;
    });

    it("Should send depositable assets to the treasury with deposit function no EXOD mint", async function () {
        const excessReserve0 = await treasury.excessReserves();
        const daiTreasuryBalance0 = await dai.balanceOf(treasury.address);
        const depositAmount = parseUnits("10", "ether");
        await dai.mint(deployer, parseUnits("10", "ether"));
        await dai.approve(assetAllocator.address, depositAmount);
        await assetAllocator.sendToTreasury(dai.address, depositAmount);
        const excessReserve1 = await treasury.excessReserves();
        const daiTreasuryBalance1 = await dai.balanceOf(treasury.address);
        expect(excessReserve1).to.eq(excessReserve0.add(depositAmount.div(1e9)));
        expect(daiTreasuryBalance1).to.eq(daiTreasuryBalance0.add(depositAmount));
        const exodBalance = await exod.balanceOf(assetAllocator.address);
        expect(exodBalance).to.eq(0);
    });

    it("Should send non-depositable assets to the treasury with transfer", async function () {
        const depositAmount = parseUnits("10", "ether");
        const token = await mockTokenFactory.deploy(0);
        token.transfer.reset();
        await token.mint(deployer, depositAmount);
        await token.approve(assetAllocator.address, depositAmount);
        const excessReserve0 = await treasury.excessReserves();
        await assetAllocator.sendToTreasury(token.address, depositAmount);
        const excessReserve1 = await treasury.excessReserves();
        const tokenTreasuryBalance1 = await token.balanceOf(treasury.address);
        expect(excessReserve1).to.eq(excessReserve0);
        expect(tokenTreasuryBalance1).to.eq(depositAmount);
        const exodBalance = await exod.balanceOf(assetAllocator.address);
        expect(exodBalance).to.eq(0);
        expect(token.transfer).to.calledWith(treasury.address, depositAmount);
    });

    it("Should set allocation", async function () {
        const allocPercentile = BigNumber.from(1000);
        await assetAllocator.setAllocation(
            dai.address,
            [strategy.address],
            [allocPercentile]
        );
        const allocation0 = await assetAllocator.getAllocation(dai.address);
        expect(allocation0.allocated).to.eq(0);
        expect(allocation0.strategies).to.have.same.members([strategy.address]);
        expect(allocation0.allocations.map((n) => n.toString())).to.have.same.members([
            "1000",
        ]);
        await assetAllocator.setAllocation(
            dai.address,
            [strategy.address, deployer],
            [2000, 3000]
        );
        const allocation1 = await assetAllocator.getAllocation(dai.address);
        expect(allocation1.allocated).to.eq(0);
        expect(allocation1.strategies).to.have.same.members([strategy.address, deployer]);
        expect(allocation1.allocations.map((n) => n.toString())).to.have.same.members([
            "2000",
            "3000",
        ]);
    });

    it("Should only update allocation if policy", async function () {
        const signer = await xhre.ethers.getSigner(randomAddress);
        const allocator = AssetAllocator__factory.connect(assetAllocator.address, signer);
        expect(
            allocator.setAllocation(dai.address, [strategy.address], [1000])
        ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allocate 20% of funds", async function () {
        await assetAllocator.setAllocation(dai.address, [strategy.address], [20_000]);
        const mintAmount = parseUnits("10000", "ether");
        await dai.mint(deployer, mintAmount);
        await dai.approve(treasury.address, mintAmount);
        await treasury.deposit(mintAmount, dai.address, mintAmount.div(2e9));
        const daiTreasuryBalance0 = await dai.balanceOf(treasury.address);
        const excessReserve0 = await treasury.excessReserves();
        expect(daiTreasuryBalance0).to.gt(0);
        await assetAllocator.reallocate(dai.address);
        const daiTreasuryBalance1 = await dai.balanceOf(treasury.address);
        const deployedAmount = daiTreasuryBalance0.mul(20).div(100);
        expect(daiTreasuryBalance1).to.eq(daiTreasuryBalance0.sub(deployedAmount));
        const stratBalance = await dai.balanceOf(strategy.address);
        expect(stratBalance).to.eq(deployedAmount);
        expect(strategy.deploy).to.have.been.calledWith(dai.address);
        const excessReserve1 = await treasury.excessReserves();
        expect(excessReserve1).to.eq(excessReserve0);
        const arfvTreasuryBalance = await arfv.balanceOf(treasury.address);
        expect(arfvTreasuryBalance).to.eq(deployedAmount.div(1e9));
        const arfvAllocBalance = await arfv.balanceOf(assetAllocator.address);
        expect(arfvAllocBalance).to.eq(0);
        const allocation = await assetAllocator.getAllocation(dai.address);
        expect(allocation.allocated).to.not.eq(0);
        expect(allocation.allocated).to.eq(deployedAmount);
    });

    it("Should allocate funds and return", async function () {
        await assetAllocator.setAllocation(dai.address, [strategy.address], [20_000]);
        const mintAmount = parseUnits("10000", "ether");
        await dai.mint(deployer, mintAmount);
        await dai.approve(treasury.address, mintAmount);
        await treasury.deposit(mintAmount, dai.address, mintAmount.div(2e9));
        const daiTreasuryBalance0 = await dai.balanceOf(treasury.address);
        const excessReserve0 = await treasury.excessReserves();
        expect(daiTreasuryBalance0).to.gt(0);
        await assetAllocator.reallocate(dai.address);
        await assetAllocator.setAllocation(dai.address, [strategy.address], [0]);
        await assetAllocator.reallocate(dai.address);
        const daiTreasuryBalance1 = await dai.balanceOf(treasury.address);
        expect(daiTreasuryBalance1).to.eq(daiTreasuryBalance0);
        const stratBalance = await dai.balanceOf(strategy.address);
        expect(stratBalance).to.eq(0);
        expect(strategy.deploy).to.have.been.calledWith(dai.address);
        const excessReserve1 = await treasury.excessReserves();
        expect(excessReserve1).to.eq(excessReserve0);
        const arfvTreasuryBalance = await arfv.balanceOf(treasury.address);
        expect(arfvTreasuryBalance).to.eq(0);
        const arfvAllocBalance = await arfv.balanceOf(assetAllocator.address);
        expect(arfvAllocBalance).to.eq(0);
        const allocation = await assetAllocator.getAllocation(dai.address);
        expect(allocation.allocated).to.eq(0);
    });

    it("Should allocate 100% of risky fund", async function () {
        const token = await mockTokenFactory.deploy(0);
        await assetAllocator.setAllocation(token.address, [strategy.address], [100_000]);
        const mintAmount = parseUnits("10000", "ether");
        await token.mint(deployer, mintAmount);
        await token.transfer(treasury.address, mintAmount);
        const tokenTreasuryBalance0 = await token.balanceOf(treasury.address);
        const excessReserve0 = await treasury.excessReserves();
        expect(tokenTreasuryBalance0).to.gt(0);
        await assetAllocator.reallocate(token.address);
        const tokenTreasuryBalance1 = await token.balanceOf(treasury.address);
        expect(tokenTreasuryBalance1).to.eq(0);
        const stratBalance = await token.balanceOf(strategy.address);
        expect(stratBalance).to.eq(tokenTreasuryBalance0);
        expect(strategy.deploy).to.have.been.calledWith(token.address);
        const excessReserve1 = await treasury.excessReserves();
        expect(excessReserve1).to.eq(excessReserve0);
        const arfvTreasuryBalance = await arfv.balanceOf(treasury.address);
        expect(arfvTreasuryBalance).to.eq(0);
        const arfvAllocBalance = await arfv.balanceOf(assetAllocator.address);
        expect(arfvAllocBalance).to.eq(0);
        const allocation = await assetAllocator.getAllocation(token.address);
        expect(allocation.allocated).to.not.eq(0);
        expect(allocation.allocated).to.eq(tokenTreasuryBalance0);
    });

    it("Should reallocate funds after allocation reduced", async function () {
        await assetAllocator.setAllocation(dai.address, [strategy.address], [20_000]);
        const mintAmount = parseUnits("10000", "ether");
        await dai.mint(deployer, mintAmount);
        await dai.approve(treasury.address, mintAmount);
        await treasury.deposit(mintAmount, dai.address, mintAmount.div(2e9));
        const daiTreasuryBalance0 = await dai.balanceOf(treasury.address);
        const excessReserve0 = await treasury.excessReserves();
        expect(daiTreasuryBalance0).to.gt(0);
        await assetAllocator.reallocate(dai.address);
        await assetAllocator.setAllocation(dai.address, [strategy.address], [10_000]);
        await assetAllocator.reallocate(dai.address);
        const daiTreasuryBalance1 = await dai.balanceOf(treasury.address);
        const deployedAmount = daiTreasuryBalance0.mul(10).div(100);
        expect(strategy.withdraw).to.have.been.calledWith(dai.address, deployedAmount);
        expect(daiTreasuryBalance1).to.eq(daiTreasuryBalance0.sub(deployedAmount));
        const stratBalance = await dai.balanceOf(strategy.address);
        expect(stratBalance).to.eq(deployedAmount);
        const excessReserve1 = await treasury.excessReserves();
        expect(excessReserve1).to.eq(excessReserve0);
        const arfvTreasuryBalance = await arfv.balanceOf(treasury.address);
        expect(arfvTreasuryBalance).to.eq(deployedAmount.div(1e9));
        const arfvAllocBalance = await arfv.balanceOf(assetAllocator.address);
        expect(arfvAllocBalance).to.eq(0);
        const allocation = await assetAllocator.getAllocation(dai.address);
        expect(allocation.allocated).to.eq(deployedAmount);
    });

    it("Should allocate 20% and 30% of funds", async function () {
        const strategy1 = await mockStrategyFactory.deploy(assetAllocator.address);
        await assetAllocator.setAllocation(
            dai.address,
            [strategy.address, strategy1.address],
            [20_000, 30_000]
        );
        const mintAmount = parseUnits("10000", "ether");
        await dai.mint(deployer, mintAmount);
        await dai.approve(treasury.address, mintAmount);
        await treasury.deposit(mintAmount, dai.address, mintAmount.div(2e9));
        const daiTreasuryBalance0 = await dai.balanceOf(treasury.address);
        const excessReserve0 = await treasury.excessReserves();
        expect(daiTreasuryBalance0).to.gt(0);
        await assetAllocator.reallocate(dai.address);
        const daiTreasuryBalance1 = await dai.balanceOf(treasury.address);
        const amountStrat0 = daiTreasuryBalance0.mul(20).div(100);
        const amountStrat1 = daiTreasuryBalance0.mul(30).div(100);
        expect(daiTreasuryBalance1).to.eq(
            daiTreasuryBalance0.sub(amountStrat0).sub(amountStrat1)
        );
        const strat0Balance = await dai.balanceOf(strategy.address);
        expect(strat0Balance).to.eq(amountStrat0);
        const strat1Balance = await dai.balanceOf(strategy1.address);
        expect(strat1Balance).to.eq(amountStrat1);
        expect(strategy.deploy).to.have.been.calledWith(dai.address);
        expect(strategy1.deploy).to.have.been.calledWith(dai.address);
        const excessReserve1 = await treasury.excessReserves();
        expect(excessReserve1).to.eq(excessReserve0);
        const arfvTreasuryBalance = await arfv.balanceOf(treasury.address);
        expect(arfvTreasuryBalance).to.eq(amountStrat0.add(amountStrat1).div(1e9));
        const arfvAllocBalance = await arfv.balanceOf(assetAllocator.address);
        expect(arfvAllocBalance).to.eq(0);
        const allocation = await assetAllocator.getAllocation(dai.address);
        expect(allocation.allocated).to.eq(amountStrat0.add(amountStrat1));
    });

    it("Should not fail if not enough ARFV", async function () {
        await assetAllocator.setAllocation(dai.address, [strategy.address], [20_000]);
        const mintAmount = parseUnits("10000", "ether");
        await dai.mint(deployer, mintAmount);
        await dai.approve(treasury.address, mintAmount);
        await treasury.deposit(mintAmount, dai.address, mintAmount.div(1e10));
        const daiTreasuryBalance0 = await dai.balanceOf(treasury.address);
        const excessReserve0 = await treasury.excessReserves();
        expect(daiTreasuryBalance0).to.gt(0);
        await assetAllocator.reallocate(dai.address);
        await toggleRights(treasury, MANAGING.RESERVEMANAGER, deployer);
        await treasury.manage(arfv.address, mintAmount.div(1e10));
        await assetAllocator.setAllocation(dai.address, [strategy.address], [0]);
        await assetAllocator.reallocate(dai.address);
        const daiTreasuryBalance1 = await dai.balanceOf(treasury.address);
        expect(daiTreasuryBalance1).to.eq(daiTreasuryBalance0);
        const stratBalance = await dai.balanceOf(strategy.address);
        expect(stratBalance).to.eq(0);
        expect(strategy.deploy).to.have.been.calledWith(dai.address);
        const excessReserve1 = await treasury.excessReserves();
        expect(excessReserve1).to.eq(excessReserve0);
        const arfvTreasuryBalance = await arfv.balanceOf(treasury.address);
        expect(arfvTreasuryBalance).to.eq(0);
        const arfvAllocBalance = await arfv.balanceOf(assetAllocator.address);
        expect(arfvAllocBalance).to.eq(0);
        const allocation = await assetAllocator.getAllocation(dai.address);
        expect(allocation.allocated).to.eq(0);
    });
});
