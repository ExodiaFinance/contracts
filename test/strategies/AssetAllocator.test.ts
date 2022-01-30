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
    MockGreedyStrategy,
    MockGreedyStrategy__factory,
    MockLoosingStrategy,
    MockLoosingStrategy__factory,
    MockStrategy,
    MockStrategy__factory,
    OlympusERC20Token,
    OlympusERC20Token__factory,
    OlympusTreasury,
    OlympusTreasury__factory,
} from "../../typechain";
import "../chai-setup";
import set = Reflect.set;

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
    let mockLoosingStrategyFactory: MockContractFactory<MockLoosingStrategy__factory>;
    let mockGreedyStrategyFactory: MockContractFactory<MockGreedyStrategy__factory>;
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
        mockLoosingStrategyFactory = await smock.mock<MockLoosingStrategy__factory>(
            "MockLoosingStrategy"
        );
        mockGreedyStrategyFactory = await smock.mock<MockGreedyStrategy__factory>(
            "MockGreedyStrategy"
        );
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
        expect(allocation0.allocations.map((bn) => bn.toString())).to.have.same.members([
            allocPercentile.toString(),
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

    describe("Rebalancing risk free funds", function () {
        const mintAmount = parseUnits("100000", "ether");
        let daiTreasuryBalance0: BigNumber;
        let totalReserves0: BigNumber;

        const setupRiskFreeFunds = deployments.createFixture(async () => {
            await dai.mint(deployer, mintAmount);
            await dai.approve(treasury.address, mintAmount);
            await treasury.deposit(mintAmount, dai.address, mintAmount.div(2e9));
        });
        beforeEach(async function () {
            await setupRiskFreeFunds();
            daiTreasuryBalance0 = await dai.balanceOf(treasury.address);
            totalReserves0 = await treasury.totalReserves();
        });

        describe("To a single strategy", function () {
            const setupAllocation = deployments.createFixture(async () => {
                await assetAllocator.setAllocation(
                    dai.address,
                    [strategy.address],
                    [20_000]
                );
                await assetAllocator.rebalance(dai.address);
            });

            beforeEach(async function () {
                await setupAllocation();
            });

            it("Should return the balance deployed", async function () {
                const deployedAmount = daiTreasuryBalance0.mul(20).div(100);
                const balance = await assetAllocator.allocatedBalance(dai.address);
                expect(balance).to.eq(deployedAmount);
            });

            it("Should allocate 20% of funds", async function () {
                const daiTreasuryBalance1 = await dai.balanceOf(treasury.address);
                const deployedAmount = daiTreasuryBalance0.mul(20).div(100);
                expect(daiTreasuryBalance1).to.eq(
                    daiTreasuryBalance0.sub(deployedAmount)
                );
                const stratBalance = await dai.balanceOf(strategy.address);
                expect(stratBalance).to.eq(deployedAmount);
                expect(strategy.deploy).to.have.been.calledWith(dai.address);
                const totalReserves1 = await treasury.totalReserves();
                expect(totalReserves1).to.eq(totalReserves0);
                const arfvTreasuryBalance = await arfv.balanceOf(treasury.address);
                expect(arfvTreasuryBalance).to.eq(deployedAmount.div(1e9));
                const arfvAllocBalance = await arfv.balanceOf(assetAllocator.address);
                expect(arfvAllocBalance).to.eq(0);
                const allocation = await assetAllocator.getAllocation(dai.address);
                expect(allocation.allocated).to.not.eq(0);
                expect(allocation.allocated).to.eq(deployedAmount);
            });

            it("Should return funds if allocation is 0", async function () {
                await assetAllocator.setAllocation(dai.address, [strategy.address], [0]);
                await assetAllocator.rebalance(dai.address);
                const daiTreasuryBalance1 = await dai.balanceOf(treasury.address);
                expect(daiTreasuryBalance1).to.eq(daiTreasuryBalance0);
                const stratBalance = await dai.balanceOf(strategy.address);
                expect(stratBalance).to.eq(0);
                expect(strategy.deploy).to.have.been.calledWith(dai.address);
                const totalReserves1 = await treasury.totalReserves();
                expect(totalReserves1).to.eq(totalReserves0);
                const arfvTreasuryBalance = await arfv.balanceOf(treasury.address);
                expect(arfvTreasuryBalance).to.eq(0);
                const arfvAllocBalance = await arfv.balanceOf(assetAllocator.address);
                expect(arfvAllocBalance).to.eq(0);
                const allocation = await assetAllocator.getAllocation(dai.address);
                expect(allocation.allocated).to.eq(0);
            });

            it("Should return funds after allocation reduced and burn ARFV", async function () {
                await assetAllocator.setAllocation(
                    dai.address,
                    [strategy.address],
                    [10_000]
                );
                await assetAllocator.rebalance(dai.address);
                const daiTreasuryBalance1 = await dai.balanceOf(treasury.address);
                const deployedAmount = daiTreasuryBalance0.mul(10).div(100);
                expect(strategy.withdraw).to.have.been.calledWith(
                    dai.address,
                    deployedAmount
                );
                expect(daiTreasuryBalance1).to.eq(
                    daiTreasuryBalance0.sub(deployedAmount)
                );
                const stratBalance = await dai.balanceOf(strategy.address);
                expect(stratBalance).to.eq(deployedAmount);
                const totalReserves1 = await treasury.totalReserves();
                expect(totalReserves1).to.eq(totalReserves0);
                const arfvTreasuryBalance = await arfv.balanceOf(treasury.address);
                expect(arfvTreasuryBalance).to.eq(deployedAmount.div(1e9));
                const arfvAllocBalance = await arfv.balanceOf(assetAllocator.address);
                expect(arfvAllocBalance).to.eq(0);
                const allocation = await assetAllocator.getAllocation(dai.address);
                expect(allocation.allocated).to.eq(deployedAmount);
            });
        });

        describe("To a single profitable strategy", function () {
            const profits = parseUnits("100", "ether");
            const deployedAmount0 = mintAmount.mul(20).div(100);
            const setup = deployments.createFixture(async (hh) => {
                await assetAllocator.setAllocation(
                    dai.address,
                    [strategy.address],
                    [20_000]
                );
                await assetAllocator.rebalance(dai.address);
                await dai.mint(deployer, profits);
                await dai.transfer(strategy.address, profits);
            });

            beforeEach(async function () {
                await setup();
            });

            it("Should return deposited and profits", async function () {
                const balance = await assetAllocator.allocatedBalance(dai.address);
                expect(balance).to.eq(deployedAmount0.add(profits));
            });

            it("Should increase excess reserve", async function () {
                const daiTreasuryBalance1 = await dai.balanceOf(treasury.address);
                await assetAllocator.setAllocation(
                    dai.address,
                    [strategy.address],
                    [10_000]
                );
                await assetAllocator.rebalance(dai.address);
                const daiTreasuryBalance2 = await dai.balanceOf(treasury.address);
                const withdrew = daiTreasuryBalance0
                    .mul(10)
                    .div(100)
                    .add(profits.mul(9).div(10));
                expect(strategy.withdraw).to.have.been.calledWith(dai.address, withdrew);
                const deployedAmount1 = deployedAmount0.div(2).add(profits.div(10));
                const stratBalance = await dai.balanceOf(strategy.address);
                expect(stratBalance.add(daiTreasuryBalance2)).to.eq(
                    mintAmount.add(profits)
                );
                expect(stratBalance).to.eq(deployedAmount1);
                expect(daiTreasuryBalance2).to.eq(daiTreasuryBalance1.add(withdrew));
                const allocation = await assetAllocator.getAllocation(dai.address);
                expect(allocation.allocated).to.eq(deployedAmount1);
                const valueOfDepositedProfits = profits.mul(9).div(10).div(1e9);
                const arfvTreasuryBalance = await arfv.balanceOf(treasury.address);
                expect(arfvTreasuryBalance).to.eq(allocation.allocated.div(1e9));
                const totalReserves1 = await treasury.totalReserves();
                expect(totalReserves1).to.be.eq(totalReserves0.add(profits.div(1e9)));
                const arfvAllocBalance = await arfv.balanceOf(assetAllocator.address);
                expect(arfvAllocBalance).to.eq(0);
            });

            it("Should increase excess reserve and send all to strategy", async function () {
                await assetAllocator.setAllocation(
                    dai.address,
                    [strategy.address],
                    [100_000]
                );
                await assetAllocator.rebalance(dai.address);
                expect(await dai.balanceOf(treasury.address)).to.eq(0);
                const stratBalance0 = await dai.balanceOf(strategy.address);
                expect(stratBalance0).to.eq(mintAmount.add(profits));
                const allocations = await assetAllocator.getAllocation(dai.address);
                expect(allocations.allocated).eq(stratBalance0);
                expect(await arfv.balanceOf(treasury.address)).to.eq(
                    allocations.allocated.div(1e9)
                );
            });
        });

        describe("To an unprofitable strategy", function () {
            let loosingStrat: MockContract<MockLoosingStrategy>;
            const returnRate = 90;
            const deployedAmount = mintAmount.mul(20).div(100);

            const setUpLoosingContrat = deployments.createFixture(async () => {
                loosingStrat = await mockLoosingStrategyFactory.deploy(
                    assetAllocator.address,
                    returnRate
                );
                await assetAllocator.setAllocation(
                    dai.address,
                    [loosingStrat.address],
                    [20_000]
                );
                await assetAllocator.rebalance(dai.address);
            });

            beforeEach(async function () {
                await setUpLoosingContrat();
            });

            it("Should return deposited sub loss", async function () {
                const balance = await assetAllocator.allocatedBalance(dai.address);
                expect(balance).to.eq(deployedAmount.mul(returnRate).div(100));
            });

            it("Should reduce excess reserve", async function () {
                await assetAllocator.setAllocation(
                    dai.address,
                    [loosingStrat.address],
                    [10_000]
                );
                const treasuryBalance0 = await dai.balanceOf(treasury.address);
                const stratdeposited0 = await loosingStrat.deposited(dai.address);
                const stratBalance0 = await loosingStrat.balance(dai.address);
                const lostAmount = deployedAmount.mul(100 - returnRate).div(100);
                expect(stratdeposited0.sub(stratBalance0)).eq(lostAmount);
                await assetAllocator.rebalance(dai.address);
                const totalReserves1 = await treasury.totalReserves();
                const stratBalance1 = await dai.balanceOf(loosingStrat.address);
                const treasuryBalance1 = await dai.balanceOf(treasury.address);
                const withdrew = stratdeposited0.sub(stratBalance1);
                const received = withdrew.mul(returnRate).div(100);
                const targetInStrat = daiTreasuryBalance0
                    .sub(lostAmount)
                    .mul(10)
                    .div(100);
                expect(await dai.balanceOf(treasury.address)).to.closeTo(
                    treasuryBalance0.add(received),
                    1e3
                );
                expect(loosingStrat.withdraw).to.have.been.calledWith(
                    dai.address,
                    stratBalance0.sub(targetInStrat)
                );
                const allocations = await assetAllocator.getAllocation(dai.address);
                const arfvBalance = await arfv.balanceOf(treasury.address);
                expect(arfvBalance).to.eq(allocations.allocated.div(1e9));
                expect(totalReserves1).to.be.lt(totalReserves0);
                expect(totalReserves1).to.be.eq(totalReserves0.sub(lostAmount.div(1e9)));
            });
        });

        describe("To a strategy with slippage", function () {
            let slippingStrategy: MockContract<MockGreedyStrategy>;
            const returnRate = 90;
            const deployedAmount = mintAmount.mul(20).div(100);

            const setUpSlippingContract = deployments.createFixture(async () => {
                slippingStrategy = await mockGreedyStrategyFactory.deploy(
                    assetAllocator.address,
                    returnRate
                );
                await assetAllocator.setAllocation(
                    dai.address,
                    [slippingStrategy.address],
                    [20_000]
                );
                await assetAllocator.rebalance(dai.address);
            });

            beforeEach(async function () {
                await setUpSlippingContract();
            });

            it("Should reduce excess reserve by slippage", async function () {
                await assetAllocator.setAllocation(
                    dai.address,
                    [slippingStrategy.address],
                    [10_000]
                );
                const treasuryBalance0 = await dai.balanceOf(treasury.address);
                const stratBalance0 = await dai.balanceOf(slippingStrategy.address);
                await assetAllocator.rebalance(dai.address);
                const totalReserves1 = await treasury.totalReserves();
                const stratBalance1 = await dai.balanceOf(slippingStrategy.address);
                const treasuryBalance1 = await dai.balanceOf(treasury.address);
                const withdrew = mintAmount.div(10);
                const received = withdrew.mul(returnRate).div(100);
                expect(await dai.balanceOf(treasury.address)).to.eq(
                    treasuryBalance0.add(received)
                );
                const allocations = await assetAllocator.getAllocation(dai.address);
                expect(allocations.allocated).to.eq(stratBalance1);
                const arfvBalance = await arfv.balanceOf(treasury.address);
                expect(arfvBalance).to.eq(allocations.allocated.div(1e9));
                expect(totalReserves1).to.be.lt(totalReserves0);
                expect(totalReserves1).to.be.eq(
                    totalReserves0.sub(withdrew.sub(received).div(1e9))
                );
            });
        });

        describe("To multiple non-greedy strategies", function () {
            let strategy1: MockContract<MockStrategy>;
            let daiTreasuryBalance1: BigNumber;

            beforeEach(async function () {
                strategy1 = await mockStrategyFactory.deploy(assetAllocator.address);
                await assetAllocator.setAllocation(
                    dai.address,
                    [strategy.address, strategy1.address],
                    [20_000, 30_000]
                );
                await assetAllocator.rebalance(dai.address);
                daiTreasuryBalance1 = await dai.balanceOf(treasury.address);
            });

            const expectProperAllocation = async (
                amountStrat0: BigNumber,
                amountStrat1: BigNumber
            ) => {
                expect(daiTreasuryBalance1).to.eq(
                    daiTreasuryBalance0.sub(amountStrat0).sub(amountStrat1)
                );
                const strat0Balance = await dai.balanceOf(strategy.address);
                expect(strat0Balance).to.eq(amountStrat0);
                const strat1Balance = await dai.balanceOf(strategy1.address);
                expect(strat1Balance).to.eq(amountStrat1);
                expect(strategy.deploy).to.have.been.calledWith(dai.address);
                expect(strategy1.deploy).to.have.been.calledWith(dai.address);
                const totalReserves1 = await treasury.totalReserves();
                expect(totalReserves1).to.eq(totalReserves0);
                const arfvTreasuryBalance = await arfv.balanceOf(treasury.address);
                expect(arfvTreasuryBalance).to.eq(
                    amountStrat0.add(amountStrat1).div(1e9)
                );
                const arfvAllocBalance = await arfv.balanceOf(assetAllocator.address);
                expect(arfvAllocBalance).to.eq(0);
                const allocation = await assetAllocator.getAllocation(dai.address);
                expect(allocation.allocated).to.eq(amountStrat0.add(amountStrat1));
            };

            it("Should allocate between multiples", async function () {
                const amountStrat0 = daiTreasuryBalance0.mul(20).div(100);
                const amountStrat1 = daiTreasuryBalance0.mul(30).div(100);
                await expectProperAllocation(amountStrat0, amountStrat1);
            });

            it("Should reallocate", async function () {
                const amountStrat0 = daiTreasuryBalance0.mul(10).div(100);
                const amountStrat1 = daiTreasuryBalance0.mul(50).div(100);
                await assetAllocator.setAllocation(
                    dai.address,
                    [strategy.address, strategy1.address],
                    [10_000, 50_000]
                );
                await assetAllocator.rebalance(dai.address);
                daiTreasuryBalance1 = await dai.balanceOf(treasury.address);
                await expectProperAllocation(amountStrat0, amountStrat1);
            });
        });

        describe("Rebalance from loosing strategy", async function () {
            let loosingStrategy: MockContract<MockLoosingStrategy>;
            const returnRate = BigNumber.from("20");
            beforeEach(async function () {
                loosingStrategy = await mockLoosingStrategyFactory.deploy(
                    assetAllocator.address,
                    returnRate
                );
                await assetAllocator.setAllocation(
                    dai.address,
                    [loosingStrategy.address],
                    [50_000]
                );
                await assetAllocator.rebalance(dai.address);
            });

            it("Should reallocate and reduce excess reserve", async function () {
                await assetAllocator.setAllocation(
                    dai.address,
                    [loosingStrategy.address, strategy.address],
                    [0, 50_000]
                );
                await assetAllocator.rebalance(dai.address);
                const deployedAmount = daiTreasuryBalance0.mul(50_000).div(100_000);
                const lostAmount = deployedAmount.sub(
                    deployedAmount.mul(returnRate).div(100)
                );
                const expectedAmountLeft = daiTreasuryBalance0.sub(lostAmount);
                const stratBalance = await dai.balanceOf(strategy.address);
                const treasuryBalance = await dai.balanceOf(treasury.address);
                const amountLeft = stratBalance.add(treasuryBalance);
                expect(expectedAmountLeft).to.eq(amountLeft);
                expect(treasuryBalance).to.eq(expectedAmountLeft.div(2));
                expect(stratBalance).to.eq(expectedAmountLeft.div(2));
                const allocation = await assetAllocator.getAllocation(dai.address);
                expect(allocation.allocated).to.eq(stratBalance);
            });
        });
    });

    describe("Allocating risky funds", function () {
        let token: MockContract<DAI>;
        let mintAmount: BigNumber;
        let tokenTreasuryBalance0: BigNumber;
        let excessReserve0: BigNumber;
        beforeEach(async function () {
            token = await mockTokenFactory.deploy(0);
            mintAmount = parseUnits("10000", "ether");
            await token.mint(deployer, mintAmount);
            await token.transfer(treasury.address, mintAmount);
            tokenTreasuryBalance0 = await token.balanceOf(treasury.address);
            excessReserve0 = await treasury.excessReserves();
        });

        describe("To a single strategy", function () {
            beforeEach(async function () {
                await assetAllocator.setAllocation(
                    token.address,
                    [strategy.address],
                    [100_000]
                );
                await assetAllocator.rebalance(token.address);
            });

            it("Should not mint ARFV", async function () {
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
        });
    });
});
