import { MockContract, MockContractFactory, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";
import { parseEther, parseUnits } from "ethers/lib/utils";
import hre from "hardhat";

import { ASSET_ALLOCATOR_DID } from "../../deploy/30_deployAssetAllocator";
import { IExtendedHRE } from "../../packages/HardhatRegistryExtension/ExtendedHRE";
import { IExodiaContractsRegistry } from "../../packages/sdk/contracts/exodiaContracts";
import {
    AllocatedRiskFreeValue,
    AllocatedRiskFreeValue__factory,
    AllocationCalculator,
    AllocationCalculator__factory,
    AssetAllocator,
    AssetAllocator__factory,
    DAI,
    DAI__factory,
    ExodiaRoles,
    ExodiaRoles__factory,
    IStrategy,
    MockBaseStrategy__factory,
    MockCollectableProfitsStrategy,
    MockCollectableProfitsStrategy__factory,
    MockFailingStrategy,
    MockGreedyStrategy,
    MockGreedyStrategy__factory,
    MockLoosingStrategy,
    MockLoosingStrategy__factory,
    MockRewardingStrategy,
    MockRewardingStrategy__factory,
    MockStrategy,
    MockStrategy__factory,
    MockToken,
    MockToken__factory,
    MockWinningStrategy,
    MockWinningStrategy__factory,
    OlympusERC20Token,
    OlympusERC20Token__factory,
    OlympusTreasury,
    OlympusTreasury__factory,
    StrategyWhitelist,
    StrategyWhitelist__factory,
} from "../../packages/sdk/typechain";
import "../chai-setup";
import { PAUSABLE_PAUSED } from "../errors";
import { increaseTime } from "../testUtils";
const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;

describe("AssetAllocator", function () {
    let deployer: string;
    let randomAddress: string;
    let randomSigner: SignerWithAddress;
    let treasury: OlympusTreasury;
    let allocationCalculator: AllocationCalculator;
    let exod: OlympusERC20Token;
    let dai: DAI;
    let arfv: AllocatedRiskFreeValue;
    let assetAllocator: AssetAllocator;
    let strategyWhitelist: StrategyWhitelist;
    let mockStrategyFactory: MockContractFactory<MockStrategy__factory>;
    let strategy: MockContract<MockStrategy>;
    let mockWinningStrategyFactory: MockContractFactory<MockWinningStrategy__factory>;
    let mockLoosingStrategyFactory: MockContractFactory<MockLoosingStrategy__factory>;
    let mockGreedyStrategyFactory: MockContractFactory<MockGreedyStrategy__factory>;
    let mockTokenFactory: MockContractFactory<MockToken__factory>;

    const setup = deployments.createFixture(async (hh) => {
        const namedAccounts = await getNamedAccounts();
        const unnamedAccounts = await getUnnamedAccounts();
        deployer = namedAccounts.deployer;
        randomAddress = unnamedAccounts[0];
        randomSigner = await xhre.ethers.getSigner(randomAddress);
        await deployments.fixture([ASSET_ALLOCATOR_DID]);
        const treasuryDeployment = await get<OlympusTreasury__factory>("OlympusTreasury");
        treasury = treasuryDeployment.contract;
        const allocCalcDeployment = await get<AllocationCalculator__factory>(
            "AllocationCalculator"
        );
        allocationCalculator = allocCalcDeployment.contract;
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
        const strategyWhitelistDeployment = await get<StrategyWhitelist__factory>(
            "StrategyWhitelist"
        );
        strategyWhitelist = strategyWhitelistDeployment.contract;
        const { contract: roles } = await get<ExodiaRoles__factory>("ExodiaRoles");
        await roles.addArchitect(deployer);
        await roles.addStrategist(deployer);
        await assetAllocator.addMachine(deployer);
        mockStrategyFactory = await smock.mock<MockStrategy__factory>("MockStrategy");
        strategy = await mockStrategyFactory.deploy();
        await strategyWhitelist.add(strategy.address);
        mockTokenFactory = await smock.mock<MockToken__factory>("MockToken");
        mockWinningStrategyFactory = await smock.mock<MockWinningStrategy__factory>(
            "MockWinningStrategy"
        );
        mockLoosingStrategyFactory = await smock.mock<MockLoosingStrategy__factory>(
            "MockLoosingStrategy"
        );
        mockGreedyStrategyFactory = await smock.mock<MockGreedyStrategy__factory>(
            "MockGreedyStrategy"
        );
    });

    beforeEach(async function () {
        await setup();
    });

    /*    
    it("Should send non-depositable assets to the treasury with transfer", async function () {
        const depositAmount = parseUnits("10", "ether");
        const token = await mockTokenFactory.deploy(0);
        token.transfer.reset();
        await token.mint(deployer, depositAmount);
        await token.approve(assetAllocator.address, depositAmount);
        await assetAllocator.sendToTreasury(token.address, depositAmount);
        const tokenTreasuryBalance1 = await token.balanceOf(treasury.address);
        expect(tokenTreasuryBalance1).to.eq(depositAmount);
    });
    */

    describe("Rebalancing", function () {
        const mintAmount = parseUnits("100000", "ether");
        let daiTreasuryBalance0: BigNumber;
        let totalReserves0: BigNumber;

        const mintTokens = deployments.createFixture(async () => {
            await dai.mint(deployer, mintAmount);
            await dai.approve(assetAllocator.address, mintAmount);
        });
        beforeEach(async function () {
            await mintTokens();
            daiTreasuryBalance0 = await dai.balanceOf(treasury.address);
            totalReserves0 = await treasury.totalReserves();
        });

        describe("To a single strategy", function () {
            const deployedAmount = mintAmount.div(2);

            const setupAllocation = deployments.createFixture(async () => {
                await allocationCalculator.setAllocation(
                    dai.address,
                    [strategy.address],
                    [100_000]
                );
                await assetAllocator.rebalance(dai.address, deployedAmount);
            });

            beforeEach(async function () {
                await setupAllocation();
            });

            it("Should return the balance deployed", async function () {
                const balance = await assetAllocator.allocatedBalance(dai.address);
                expect(balance).to.eq(deployedAmount);
            });

            it("Should send the fund in the strategy", async function () {
                expect(await dai.balanceOf(deployer)).to.eq(deployedAmount);
                expect(await dai.balanceOf(strategy.address)).to.eq(deployedAmount);
            });

            it("Should do nothing", async function () {
                await assetAllocator.rebalance(dai.address, deployedAmount);
                expect(await dai.balanceOf(deployer)).to.eq(deployedAmount);
                expect(await dai.balanceOf(strategy.address)).to.eq(deployedAmount);
            });

            it("Should return all funds", async function () {
                await allocationCalculator.setAllocation(
                    dai.address,
                    [strategy.address],
                    [0]
                );
                await assetAllocator.rebalance(dai.address, mintAmount);
                expect(await dai.balanceOf(deployer)).to.eq(mintAmount);
                const stratBalance = await dai.balanceOf(strategy.address);
                expect(stratBalance).to.eq(0);
                expect(strategy.deploy).to.have.been.calledWith(dai.address);
            });

            it("Should return all funds", async function () {
                await assetAllocator.rebalance(dai.address, 0);
                expect(await dai.balanceOf(deployer)).to.eq(mintAmount);
                const stratBalance = await dai.balanceOf(strategy.address);
                expect(stratBalance).to.eq(0);
                expect(strategy.deploy).to.have.been.calledWith(dai.address);
            });

            it("Should return funds if allocation reduced", async function () {
                await allocationCalculator.setAllocation(
                    dai.address,
                    [strategy.address],
                    [10_000]
                );
                await assetAllocator.rebalance(dai.address, deployedAmount);
                const deployedAmount1 = deployedAmount.mul(10).div(100);
                expect(strategy.withdrawTo).to.have.been.calledWith(
                    dai.address,
                    deployedAmount.sub(deployedAmount1),
                    deployer
                );
                expect(await dai.balanceOf(deployer)).to.eq(
                    mintAmount.sub(deployedAmount1)
                );
                const stratBalance = await dai.balanceOf(strategy.address);
                expect(stratBalance).to.eq(deployedAmount1);
            });

            it("Should add funds", async function () {
                await allocationCalculator.setAllocation(
                    dai.address,
                    [strategy.address],
                    [90_000]
                );
                await assetAllocator.rebalance(dai.address, deployedAmount);
                const targetAmount = deployedAmount.mul(90).div(100);
                expect(await dai.balanceOf(deployer)).to.eq(mintAmount.sub(targetAmount));
                const stratBalance = await dai.balanceOf(strategy.address);
                expect(stratBalance).to.eq(targetAmount);
            });

            it("Should add funds even if alloc reduced", async function () {
                await allocationCalculator.setAllocation(
                    dai.address,
                    [strategy.address],
                    [30_000]
                );
                await assetAllocator.rebalance(dai.address, mintAmount);
                const deployedAmount1 = mintAmount.mul(30).div(100);
                expect(await dai.balanceOf(deployer)).to.eq(
                    mintAmount.sub(deployedAmount1)
                );
                const stratBalance = await dai.balanceOf(strategy.address);
                expect(stratBalance).to.eq(deployedAmount1);
            });
        });

        describe("To a single profitable strategy", function () {
            const profits = parseUnits("100", "ether");
            const deployedAmount0 = mintAmount;

            const setupSingleStrat = deployments.createFixture(async (hh) => {
                await allocationCalculator.setAllocation(
                    dai.address,
                    [strategy.address],
                    [100_000]
                );
                await assetAllocator.rebalance(dai.address, mintAmount);
                // Strategy returns the balance, so adding tokens simulates profits
                await dai.mint(strategy.address, profits);
            });

            beforeEach(async function () {
                await setupSingleStrat();
            });

            it("Should return deposited and profits", async function () {
                const balance = await assetAllocator.allocatedBalance(dai.address);
                expect(balance).to.eq(deployedAmount0.add(profits));
            });

            it("Should withdraw deployed amount with profits", async function () {
                await allocationCalculator.setAllocation(
                    dai.address,
                    [strategy.address],
                    [0]
                );
                await assetAllocator.rebalance(dai.address, mintAmount);
                expect(strategy.withdrawTo).to.have.been.calledWith(
                    dai.address,
                    deployedAmount0.add(profits),
                    deployer
                );
                const stratBalance = await dai.balanceOf(strategy.address);
                expect(stratBalance).to.eq(0);
                expect(await dai.balanceOf(deployer)).to.eq(mintAmount.add(profits));
            });

            it("Should withdraw profits", async function () {
                await assetAllocator.rebalance(dai.address, deployedAmount0);
                expect(await dai.balanceOf(strategy.address)).to.eq(deployedAmount0);
                expect(await dai.balanceOf(deployer)).to.eq(profits);
            });

            it("Should add on top of profits", async function () {
                const newDeposit = parseUnits("1000", "ether");
                await dai.mint(deployer, newDeposit);
                await dai.approve(assetAllocator.address, newDeposit);
                await assetAllocator.rebalance(
                    dai.address,
                    deployedAmount0.add(newDeposit)
                );
                expect(await dai.balanceOf(deployer)).to.eq(profits);
                expect(await dai.balanceOf(strategy.address)).to.eq(
                    deployedAmount0.add(newDeposit)
                );
            });
        });

        describe("To an unprofitable strategy", function () {
            let loosingStrat: MockContract<MockLoosingStrategy>;
            const returnRate = 90;
            const deployedAmount = mintAmount;

            const setUpLoosingContrat = deployments.createFixture(async () => {
                loosingStrat = await mockLoosingStrategyFactory.deploy(returnRate);
                await strategyWhitelist.add(loosingStrat.address);
                await allocationCalculator.setAllocation(
                    dai.address,
                    [loosingStrat.address],
                    [100_000]
                );
                await assetAllocator.rebalance(dai.address, deployedAmount);
            });

            beforeEach(async function () {
                await setUpLoosingContrat();
            });

            it("Should return deposited sub loss", async function () {
                const balance = await assetAllocator.allocatedBalance(dai.address);
                expect(balance).to.eq(deployedAmount.mul(returnRate).div(100));
            });

            it("Should fail when trying to rebalance more", async function () {
                const newDeposit = parseUnits("1000", "ether");
                await dai.mint(deployer, newDeposit);
                await dai.approve(assetAllocator.address, newDeposit);
                expect(
                    assetAllocator.rebalance(dai.address, mintAmount.add(newDeposit))
                ).to.revertedWith("Dai/insufficient-balance");
            });

            it("Should not fail allocating more if accounting for loss", async function () {
                const newDeposit = parseUnits("1000", "ether");
                await dai.mint(deployer, newDeposit);
                await dai.approve(assetAllocator.address, newDeposit);
                await assetAllocator.rebalance(
                    dai.address,
                    deployedAmount
                        .add(newDeposit)
                        .sub(deployedAmount.mul(100 - returnRate).div(100))
                );
                expect(await loosingStrat.balance(dai.address)).to.eq(
                    deployedAmount
                        .mul(returnRate)
                        .div(100)
                        .add(newDeposit)
                        .mul(returnRate)
                        .div(100)
                );
                expect(await dai.balanceOf(deployer)).to.eq(0);
            });

            it("Should withdraw everything", async function () {
                await allocationCalculator.setAllocation(
                    dai.address,
                    [loosingStrat.address],
                    [0]
                );
                await assetAllocator.rebalance(dai.address, deployedAmount);
                expect(await loosingStrat.balance(dai.address)).to.eq(0);
                expect(await dai.balanceOf(deployer)).to.eq(
                    deployedAmount.mul(returnRate).div(100)
                );
            });
        });

        describe("To multiple strategies", function () {
            const alloc0 = 30_000;
            const alloc1 = 70_000;
            const maxAlloc = 100_000;
            let strat0: MockContract<MockStrategy>;
            let strat1: MockContract<MockStrategy>;
            // let balanceTotal = mintAmount;

            const amountAllocReturned =
                (returnRate: number) => (allocTo: number, balance: BigNumber) =>
                    balance.mul(returnRate).div(100).mul(allocTo).div(maxAlloc);

            const amountAlloc = amountAllocReturned(100);

            const loss = (lossPercent: number) => (amount: BigNumber) =>
                amount.mul(lossPercent).div(100);

            const expectProperAllocation = async (
                amountStrat0: BigNumberish,
                amountStrat1: BigNumberish,
                balance: BigNumberish = 0
            ) => {
                expect(await dai.balanceOf(deployer)).to.eq(balance);
                const strat0Balance = await strat0.balance(dai.address);
                expect(strat0Balance).to.eq(amountStrat0);
                const strat1Balance = await strat1.balance(dai.address);
                expect(strat1Balance).to.eq(amountStrat1);
            };

            const testAllocations = (
                balance0: (alloc: number, total: BigNumber) => BigNumber,
                balance1: (alloc: number, total: BigNumber) => BigNumber,
                loss0: (withdrawn: BigNumber) => BigNumber,
                loss1: (withdrawn: BigNumber) => BigNumber
            ) => {
                it("Should return total balance", async function () {
                    expect(await assetAllocator.allocatedBalance(dai.address)).eq(
                        balance0(alloc0, mintAmount).add(balance1(alloc1, mintAmount))
                    );
                });

                it("Should allocate between multiples", async function () {
                    const amountStrat0 = balance0(alloc0, mintAmount);
                    const amountStrat1 = balance1(alloc1, mintAmount);
                    await expectProperAllocation(amountStrat0, amountStrat1);
                });

                it("Should rebalance if loss/profits", async function () {
                    const balanceBefore0 = balance0(alloc0, mintAmount);
                    const balanceBefore1 = balance1(alloc1, mintAmount);
                    const balanceTotal = balance0(alloc0, mintAmount).add(
                        balance1(alloc1, mintAmount)
                    );
                    await dai.approve(assetAllocator.address, balanceTotal);
                    await assetAllocator.rebalance(dai.address, balanceTotal);
                    const amountWithdrawn0 = balance0(alloc0, balanceTotal)
                        .sub(balanceBefore0)
                        .mul(-1);
                    const amountWithdrawn1 = balance1(alloc1, balanceTotal)
                        .sub(balanceBefore1)
                        .mul(-1);
                    const amountLoss0 = amountWithdrawn0.gt(0)
                        ? loss0(amountWithdrawn0)
                        : BigNumber.from(0);
                    const amountLoss1 = amountWithdrawn1.gt(0)
                        ? loss1(amountWithdrawn1)
                        : BigNumber.from(0);
                    let amount0 = balanceTotal.mul(alloc0).div(maxAlloc);
                    let amount1 = balanceTotal.mul(alloc1).div(maxAlloc);
                    if (amountLoss0.gt(0)) {
                        amount1 = amount1.sub(amountLoss0);
                    }
                    if (amountLoss1.gt(0)) {
                        amount0 = amount0.sub(amountLoss1);
                    }
                    amount0 = balance0(maxAlloc, amount0);
                    amount1 = balance1(maxAlloc, amount1);
                    await expectProperAllocation(amount0, amount1);
                });

                it("Should reallocate higher-lower", async function () {
                    const newAlloc0 = 40_000;
                    const newAlloc1 = 60_000;
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [newAlloc0, newAlloc1]
                    );
                    const balanceBefore0 = balance0(alloc0, mintAmount);
                    const balanceBefore1 = balance1(alloc1, mintAmount);
                    const balanceTotal = balanceBefore0.add(balanceBefore1);
                    await dai.approve(assetAllocator.address, balanceTotal);
                    await assetAllocator.rebalance(dai.address, balanceTotal);
                    const amountWithdrawn0 = balance0(newAlloc0, balanceTotal)
                        .sub(balanceBefore0)
                        .mul(-1);
                    const amountWithdrawn1 = balance1(newAlloc1, balanceTotal)
                        .sub(balanceBefore1)
                        .mul(-1);
                    const amountLoss0 = amountWithdrawn0.gt(0)
                        ? loss0(amountWithdrawn0)
                        : BigNumber.from(0);
                    const amountLoss1 = amountWithdrawn1.gt(0)
                        ? loss1(amountWithdrawn1)
                        : BigNumber.from(0);
                    let amount0 = balanceTotal.mul(newAlloc0).div(maxAlloc);
                    let amount1 = balanceTotal.mul(newAlloc1).div(maxAlloc);
                    if (amountLoss0.gt(0)) {
                        amount1 = amount1.sub(amountLoss0);
                    }
                    if (amountLoss1.gt(0)) {
                        amount0 = amount0.sub(amountLoss1);
                    }
                    amount0 = balance0(maxAlloc, amount0);
                    amount1 = balance1(maxAlloc, amount1);
                    await expectProperAllocation(amount0, amount1);
                });

                it("Should reallocate lower-higher", async function () {
                    const newAlloc0 = 10_000;
                    const newAlloc1 = 90_000;
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [newAlloc0, newAlloc1]
                    );
                    const balanceTotal = balance0(alloc0, mintAmount).add(
                        balance1(alloc1, mintAmount)
                    );
                    await dai.approve(assetAllocator.address, balanceTotal);
                    await assetAllocator.rebalance(dai.address, balanceTotal);
                    const amountWithdrawn0 = balance0(alloc0 - newAlloc0, balanceTotal);
                    const amountWithdrawn1 = balance1(alloc1 - newAlloc1, balanceTotal);
                    const amountLoss0 = loss0(amountWithdrawn0);
                    const amountLoss1 = loss1(amountWithdrawn1);
                    let amount0 = balance0(newAlloc0, balanceTotal);
                    let amount1 = balance1(newAlloc1, balanceTotal);
                    if (amountLoss0.gt(0)) {
                        amount1 = amount1.sub(amountLoss0);
                    }
                    if (amountLoss1.gt(0)) {
                        amount0 = amount0.sub(amountLoss1);
                    }
                    await expectProperAllocation(amount0, amount1);
                });

                it("Should add tokens", async function () {
                    const balanceBefore0 = balance0(alloc0, mintAmount);
                    const balanceBefore1 = balance1(alloc1, mintAmount);
                    let balanceTotal = balance0(alloc0, mintAmount).add(
                        balance1(alloc1, mintAmount)
                    );
                    const newDeposit = parseUnits("1000", "ether");
                    await dai.mint(deployer, newDeposit);
                    balanceTotal = balanceTotal.add(newDeposit);
                    await dai.approve(assetAllocator.address, balanceTotal);
                    await assetAllocator.rebalance(dai.address, balanceTotal);
                    const amountWithdrawn0 = balance0(alloc0, balanceTotal)
                        .sub(balanceBefore0)
                        .mul(-1);
                    const amountWithdrawn1 = balance1(alloc1, balanceTotal)
                        .sub(balanceBefore1)
                        .mul(-1);
                    const amountLoss0 = amountWithdrawn0.gt(0)
                        ? loss0(amountWithdrawn0)
                        : BigNumber.from(0);
                    const amountLoss1 = amountWithdrawn1.gt(0)
                        ? loss1(amountWithdrawn1)
                        : BigNumber.from(0);
                    let amount0 = balanceTotal.mul(alloc0).div(maxAlloc);
                    let amount1 = balanceTotal.mul(alloc1).div(maxAlloc);
                    if (amountLoss0.gt(0)) {
                        amount1 = amount1.sub(amountLoss0);
                    }
                    if (amountLoss1.gt(0)) {
                        amount0 = amount0.sub(amountLoss1);
                    }
                    amount0 = balance0(maxAlloc, amount0);
                    amount1 = balance1(maxAlloc, amount1);
                    await expectProperAllocation(amount0, amount1);
                });

                it("Should withdraw tokens", async function () {
                    const balanceTotal = balance0(alloc0, mintAmount)
                        .add(balance1(alloc1, mintAmount))
                        .div(2);
                    const amountStrat0 = balance0(alloc0, balanceTotal);
                    const amountStrat1 = balance1(alloc1, balanceTotal);
                    await dai.approve(assetAllocator.address, balanceTotal);
                    await assetAllocator.rebalance(dai.address, balanceTotal);
                    const amountWithdrawn0 = balance0(alloc0, mintAmount).sub(
                        amountStrat0
                    );
                    const amountWithdrawn1 = balance1(alloc1, mintAmount).sub(
                        amountStrat1
                    );
                    const amountLoss0 = loss0(amountWithdrawn0);
                    const amountLoss1 = loss1(amountWithdrawn1);
                    await expectProperAllocation(
                        amountStrat0,
                        amountStrat1,
                        balanceTotal.sub(amountLoss0).sub(amountLoss1)
                    );
                });

                it("Should add and reallocate", async function () {
                    const newAlloc0 = 40_000;
                    const newAlloc1 = 60_000;
                    const balanceBefore0 = balance0(alloc0, mintAmount);
                    const balanceBefore1 = balance1(alloc1, mintAmount);
                    let balanceTotal = balance0(alloc0, mintAmount).add(
                        balance1(alloc1, mintAmount)
                    );
                    const newDeposit = parseUnits("1000", "ether");
                    await dai.mint(deployer, newDeposit);
                    balanceTotal = balanceTotal.add(newDeposit);
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [newAlloc0, newAlloc1]
                    );
                    await dai.approve(assetAllocator.address, balanceTotal);
                    await assetAllocator.rebalance(dai.address, balanceTotal);
                    const amountWithdrawn0 = balance0(newAlloc0, balanceTotal)
                        .sub(balanceBefore0)
                        .mul(-1);
                    const amountWithdrawn1 = balance1(newAlloc1, balanceTotal)
                        .sub(balanceBefore1)
                        .mul(-1);
                    const amountLoss0 = amountWithdrawn0.gt(0)
                        ? loss0(amountWithdrawn0)
                        : BigNumber.from(0);
                    const amountLoss1 = amountWithdrawn1.gt(0)
                        ? loss1(amountWithdrawn1)
                        : BigNumber.from(0);
                    let amount0 = balanceTotal.mul(newAlloc0).div(maxAlloc);
                    let amount1 = balanceTotal.mul(newAlloc1).div(maxAlloc);
                    if (amountLoss0.gt(0)) {
                        amount1 = amount1.sub(amountLoss0);
                    }
                    if (amountLoss1.gt(0)) {
                        amount0 = amount0.sub(amountLoss1);
                    }
                    amount0 = balance0(maxAlloc, amount0);
                    amount1 = balance1(maxAlloc, amount1);
                    await expectProperAllocation(amount0, amount1);
                });

                it("Should remove and reallocate", async function () {
                    const balanceBefore0 = balance0(alloc0, mintAmount);
                    const balanceBefore1 = balance1(alloc1, mintAmount);
                    const balanceTotal = balance0(alloc0, mintAmount)
                        .add(balance1(alloc1, mintAmount))
                        .div(2);
                    const newAlloc0 = 40_000;
                    const newAlloc1 = 60_000;
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [newAlloc0, newAlloc1]
                    );
                    await dai.approve(assetAllocator.address, balanceTotal);
                    await assetAllocator.rebalance(dai.address, balanceTotal);
                    const amountWithdrawn0 = balanceBefore0.sub(
                        balance0(newAlloc0, balanceTotal)
                    );
                    const amountWithdrawn1 = balanceBefore1.sub(
                        balance1(newAlloc1, balanceTotal)
                    );
                    const amountLoss0 = loss0(amountWithdrawn0);
                    const amountLoss1 = loss1(amountWithdrawn1);
                    await expectProperAllocation(
                        balance0(newAlloc0, balanceTotal),
                        balance1(newAlloc1, balanceTotal),
                        balanceTotal.sub(amountLoss0).sub(amountLoss1)
                    );
                });
            };

            describe("For regulars strategies", function () {
                const setupRegularRegular = deployments.createFixture(async (hh) => {
                    strat0 = await mockStrategyFactory.deploy();
                    strat1 = await mockStrategyFactory.deploy();
                    await strategyWhitelist.add(strat1.address);
                    await strategyWhitelist.add(strat0.address);
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [alloc0, alloc1]
                    );
                    await assetAllocator.rebalance(dai.address, mintAmount);
                });

                beforeEach(async function () {
                    await setupRegularRegular();
                });

                testAllocations(amountAlloc, amountAlloc, loss(0), loss(0));
            });

            describe("For regular-loosing strategies", function () {
                const returnRate = 80;

                const setupRegularLoosing = deployments.createFixture(async (hh) => {
                    strat0 = await mockStrategyFactory.deploy();
                    strat1 = await mockLoosingStrategyFactory.deploy(80);
                    await strategyWhitelist.add(strat1.address);
                    await strategyWhitelist.add(strat0.address);
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [alloc0, alloc1]
                    );
                    await assetAllocator.rebalance(dai.address, mintAmount);
                });

                beforeEach(async function () {
                    await setupRegularLoosing();
                });

                testAllocations(
                    amountAlloc,
                    amountAllocReturned(returnRate),
                    loss(0),
                    loss(0)
                );
            });

            describe("For loosing-loosing strategies", function () {
                const returnRate0 = 40;
                const returnRate1 = 80;

                const setUpLoosingLoosing = deployments.createFixture(async (hh) => {
                    strat0 = await mockLoosingStrategyFactory.deploy(returnRate0);
                    strat1 = await mockLoosingStrategyFactory.deploy(returnRate1);
                    await strategyWhitelist.add(strat1.address);
                    await strategyWhitelist.add(strat0.address);
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [alloc0, alloc1]
                    );
                    await assetAllocator.rebalance(dai.address, mintAmount);
                });

                beforeEach(async function () {
                    await setUpLoosingLoosing();
                });

                testAllocations(
                    amountAllocReturned(returnRate0),
                    amountAllocReturned(returnRate1),
                    loss(0),
                    loss(0)
                );
            });

            describe("For winning-regular strategies", function () {
                const returnRate0 = 110;

                const setUpWinningRegular = deployments.createFixture(async (hh) => {
                    strat0 = await mockWinningStrategyFactory.deploy(
                        assetAllocator.address,
                        dai.address,
                        returnRate0
                    );
                    strat1 = await mockStrategyFactory.deploy();
                    await strategyWhitelist.add(strat1.address);
                    await strategyWhitelist.add(strat0.address);
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [alloc0, alloc1]
                    );
                    await dai.addAuth(strat0.address);
                    await assetAllocator.rebalance(dai.address, mintAmount);
                });

                beforeEach(async function () {
                    await setUpWinningRegular();
                });

                testAllocations(
                    amountAllocReturned(returnRate0),
                    amountAlloc,
                    loss(0),
                    loss(0)
                );
            });

            describe("For winning-winning strategies", function () {
                const returnRate0 = 110;
                const returnRate1 = 200;

                const setUpWinningRegular = deployments.createFixture(async (hh) => {
                    strat0 = await mockWinningStrategyFactory.deploy(
                        assetAllocator.address,
                        dai.address,
                        returnRate0
                    );
                    strat1 = await mockWinningStrategyFactory.deploy(
                        assetAllocator.address,
                        dai.address,
                        returnRate1
                    );
                    await strategyWhitelist.add(strat1.address);
                    await strategyWhitelist.add(strat0.address);
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [alloc0, alloc1]
                    );
                    await dai.addAuth(strat0.address);
                    await dai.addAuth(strat1.address);
                    await assetAllocator.rebalance(dai.address, mintAmount);
                });

                beforeEach(async function () {
                    await setUpWinningRegular();
                });

                testAllocations(
                    amountAllocReturned(returnRate0),
                    amountAllocReturned(returnRate1),
                    loss(0),
                    loss(0)
                );
            });

            describe("For loosing-winning strategies", function () {
                const returnRate0 = 20;
                const returnRate1 = 200;

                const setUpWinningRegular = deployments.createFixture(async (hh) => {
                    strat0 = await mockLoosingStrategyFactory.deploy(returnRate0);
                    strat1 = await mockWinningStrategyFactory.deploy(
                        assetAllocator.address,
                        dai.address,
                        returnRate1
                    );
                    await strategyWhitelist.add(strat1.address);
                    await strategyWhitelist.add(strat0.address);
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [alloc0, alloc1]
                    );
                    await dai.addAuth(strat1.address);
                    await assetAllocator.rebalance(dai.address, mintAmount);
                });

                beforeEach(async function () {
                    await setUpWinningRegular();
                });

                testAllocations(
                    amountAllocReturned(returnRate0),
                    amountAllocReturned(returnRate1),
                    loss(0),
                    loss(0)
                );
            });

            describe("For regular-slipping strategies", function () {
                const returnRate1 = 90;

                const setUpRegularSlipping = deployments.createFixture(async (hh) => {
                    strat0 = await mockStrategyFactory.deploy();
                    strat1 = await mockGreedyStrategyFactory.deploy(
                        assetAllocator.address,
                        returnRate1
                    );
                    await strategyWhitelist.add(strat1.address);
                    await strategyWhitelist.add(strat0.address);
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [alloc0, alloc1]
                    );
                    await assetAllocator.rebalance(dai.address, mintAmount);
                });

                beforeEach(async function () {
                    await setUpRegularSlipping();
                });

                testAllocations(
                    amountAlloc,
                    amountAlloc,
                    loss(0),
                    loss(100 - returnRate1)
                );
            });

            describe("For slipping-slipping strategies", function () {
                const returnRate0 = 50;
                const returnRate1 = 90;

                const setUpRegularSlipping = deployments.createFixture(async (hh) => {
                    strat0 = await mockGreedyStrategyFactory.deploy(
                        assetAllocator.address,
                        returnRate0
                    );
                    strat1 = await mockGreedyStrategyFactory.deploy(
                        assetAllocator.address,
                        returnRate1
                    );
                    await strategyWhitelist.add(strat1.address);
                    await strategyWhitelist.add(strat0.address);
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [alloc0, alloc1]
                    );
                    await assetAllocator.rebalance(dai.address, mintAmount);
                });

                beforeEach(async function () {
                    await setUpRegularSlipping();
                });

                testAllocations(
                    amountAlloc,
                    amountAlloc,
                    loss(100 - returnRate0),
                    loss(100 - returnRate1)
                );
            });

            describe("For winning-slipping strategies", function () {
                const returnRate0 = 110;
                const returnRate1 = 90;

                const setUpWinningSlipping = deployments.createFixture(async (hh) => {
                    strat0 = await mockWinningStrategyFactory.deploy(
                        assetAllocator.address,
                        dai.address,
                        returnRate0
                    );
                    strat1 = await mockGreedyStrategyFactory.deploy(
                        assetAllocator.address,
                        returnRate1
                    );
                    await strategyWhitelist.add(strat1.address);
                    await strategyWhitelist.add(strat0.address);
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [alloc0, alloc1]
                    );
                    await dai.addAuth(strat0.address);
                    await assetAllocator.rebalance(dai.address, mintAmount);
                });

                beforeEach(async function () {
                    await setUpWinningSlipping();
                });

                testAllocations(
                    amountAllocReturned(returnRate0),
                    amountAlloc,
                    loss(0),
                    loss(100 - returnRate1)
                );
            });

            describe("For loosing-slipping strategies", function () {
                const returnRate0 = 80;
                const returnRate1 = 90;

                const setUpWinningSlipping = deployments.createFixture(async (hh) => {
                    strat0 = await mockLoosingStrategyFactory.deploy(returnRate0);
                    strat1 = await mockGreedyStrategyFactory.deploy(
                        assetAllocator.address,
                        returnRate1
                    );
                    await strategyWhitelist.add(strat1.address);
                    await strategyWhitelist.add(strat0.address);
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [alloc0, alloc1]
                    );
                    await dai.addAuth(strat0.address);
                    await assetAllocator.rebalance(dai.address, mintAmount);
                });

                beforeEach(async function () {
                    await setUpWinningSlipping();
                });

                testAllocations(
                    amountAllocReturned(returnRate0),
                    amountAlloc,
                    loss(0),
                    loss(100 - returnRate1)
                );
            });
        });
    });

    describe("CollectRewards", function () {
        const amount0 = parseUnits("1", "ether");
        const amount1 = parseUnits("3", "ether");
        const amount2 = parseUnits("7", "ether");
        const amount3 = parseUnits("12", "ether");
        let tok0: MockContract<MockToken>;
        let tok1: MockContract<MockToken>;
        let tok2: MockContract<MockToken>;
        let strat0: MockContract<MockRewardingStrategy>;
        let strat1: MockContract<MockRewardingStrategy>;

        const setupRewards = deployments.createFixture(async (hh) => {
            tok0 = await mockTokenFactory.deploy(18);
            tok1 = await mockTokenFactory.deploy(17);
            tok2 = await mockTokenFactory.deploy(5);
            const rewardStratFactory = await smock.mock<MockRewardingStrategy__factory>(
                "MockRewardingStrategy"
            );
            strat0 = await rewardStratFactory.deploy(tok0.address, tok1.address);
            strat1 = await rewardStratFactory.deploy(tok1.address, tok2.address);
            await strat0.setRewards(amount0, amount1);
            await strat1.setRewards(amount2, amount3);
            await strategyWhitelist.add(strat1.address);
            await strategyWhitelist.add(strat0.address);
            await allocationCalculator.setAllocation(
                dai.address,
                [strat0.address, strat1.address],
                [50_000, 50_000]
            );
        });

        beforeEach(async function () {
            await setupRewards();
        });

        it("Should collect rewards and deposit in treasury", async function () {
            await assetAllocator.collectRewards(dai.address);
            expect(await tok0.balanceOf(treasury.address)).to.eq(amount0);
            expect(await tok1.balanceOf(treasury.address)).to.eq(amount1.add(amount2));
            expect(await tok2.balanceOf(treasury.address)).to.eq(amount3);
        });
    });

    describe("CollectProfits", function () {
        const amount0 = parseUnits("1", "ether");
        const amount1 = parseUnits("3", "ether");
        let tok0: MockContract<MockToken>;
        let strat0: MockContract<MockCollectableProfitsStrategy>;
        let strat1: MockContract<MockCollectableProfitsStrategy>;

        const setupRewards = deployments.createFixture(async (hh) => {
            tok0 = await mockTokenFactory.deploy(18);
            const profitsStratFactory =
                await smock.mock<MockCollectableProfitsStrategy__factory>(
                    "MockCollectableProfitsStrategy"
                );
            strat0 = await profitsStratFactory.deploy();
            strat1 = await profitsStratFactory.deploy();
            await strat0.setProfits(amount0);
            await strat1.setProfits(amount1);
            await strategyWhitelist.add(strat1.address);
            await strategyWhitelist.add(strat0.address);
            await allocationCalculator.setAllocation(
                tok0.address,
                [strat0.address, strat1.address],
                [50_000, 50_000]
            );
        });

        beforeEach(async function () {
            await setupRewards();
        });

        it("Should collect rewards and deposit in treasury", async function () {
            await assetAllocator.collectProfits(tok0.address);
            expect(await tok0.balanceOf(treasury.address)).to.eq(amount0.add(amount1));
        });
    });

    describe("Allocate", function () {
        const returns0 = 80;
        const returns1 = 50;

        let tok0: MockContract<MockToken>;
        let strat0: MockContract<MockStrategy>;
        let strat1: MockContract<MockStrategy>;

        const alloc0 = 90_000;
        const alloc1 = 10_000;
        const totalAlloc = alloc0 + alloc1;

        const amount0 = parseEther("1000");
        const amount1 = parseEther("200");

        const setupStrats = deployments.createFixture(async (hh) => {
            tok0 = await mockTokenFactory.deploy(18);
            const loosingStratFactory = await smock.mock<MockStrategy__factory>(
                "MockStrategy"
            );
            strat0 = await loosingStratFactory.deploy();
            strat0.balance.returns(parseEther("1")); // sets non-sense value for balance, cause it's not supposed ot be used
            strat1 = await loosingStratFactory.deploy();
            strat0.balance.returns(parseEther("10000"));
            await strategyWhitelist.add(strat1.address);
            await strategyWhitelist.add(strat0.address);
            await allocationCalculator.setAllocation(
                tok0.address,
                [strat0.address, strat1.address],
                [alloc0, alloc1]
            );
            await tok0.mint(deployer, amount0);
            await tok0.approve(assetAllocator.address, amount0);
            await assetAllocator.allocate(tok0.address, amount0);
        });

        beforeEach(async function () {
            await setupStrats();
        });

        it("Should allocate", async function () {
            expect(await tok0.balanceOf(strat0.address)).to.eq(
                amount0.mul(alloc0).div(totalAlloc)
            );
            expect(await tok0.balanceOf(strat1.address)).to.eq(
                amount0.mul(alloc1).div(totalAlloc)
            );
        });

        it("Should add allocation", async function () {
            await tok0.mint(deployer, amount1);
            const totalAmount = amount0.add(amount1);
            await tok0.approve(assetAllocator.address, totalAmount);
            await assetAllocator.allocate(tok0.address, totalAmount);
            expect(await tok0.balanceOf(strat0.address)).to.eq(
                totalAmount.mul(alloc0).div(totalAlloc)
            );
            expect(await tok0.balanceOf(strat1.address)).to.eq(
                totalAmount.mul(alloc1).div(totalAlloc)
            );
        });

        it("Should not withdraw", async function () {
            const bal0 = await tok0.balanceOf(strat0.address);
            const bal1 = await tok0.balanceOf(strat1.address);
            await assetAllocator.allocate(tok0.address, 0);
            expect(await tok0.balanceOf(strat0.address)).to.eq(bal0);
            expect(await tok0.balanceOf(strat1.address)).to.eq(bal1);
        });
    });

    describe("Handle failing strategy", function () {
        let tok0: MockContract<MockToken>;
        let strat: MockContract<MockFailingStrategy>;
        const amount = parseEther("10");

        const setupBaseStrat = deployments.createFixture(async (hh) => {
            const { contract: roles } = await get<ExodiaRoles__factory>("ExodiaRoles");
            await roles.addArchitect(deployer);
            await roles.addStrategist(deployer);
            tok0 = await mockTokenFactory.deploy(18);
            const baseStratFactory = await smock.mock<MockBaseStrategy__factory>(
                "MockFailingStrategy"
            );
            strat = await baseStratFactory.deploy();
            await strategyWhitelist.add(strat.address);
            await allocationCalculator.setAllocation(
                tok0.address,
                [strat.address],
                [100_000]
            );
        });

        beforeEach(async function () {
            await setupBaseStrat();
        });

        it("Should support failing deployment", async function () {
            await tok0.mint(deployer, amount);
            await tok0.approve(assetAllocator.address, amount);
            await expect(
                assetAllocator.allocate(tok0.address, amount)
            ).to.not.revertedWith(PAUSABLE_PAUSED);
            expect(strat.deploy).to.have.been.called;
        });

        it("Should support failing withdraw", async function () {
            await tok0.mint(strat.address, amount);
            await allocationCalculator.setAllocation(tok0.address, [strat.address], [0]);
            await expect(assetAllocator.rebalance(tok0.address, 0)).to.not.be.reverted;
            expect(strat.withdrawTo).to.have.been.called;
        });

        it("Should support failing collect rewards", async function () {
            await expect(assetAllocator.collectRewards(tok0.address)).to.not.be.reverted;
            expect(strat.collectRewards).to.have.been.called;
        });

        it("Should support failing collect profits", async function () {
            await expect(assetAllocator.collectProfits(tok0.address)).to.not.be.reverted;
            expect(strat.collectProfits).to.have.been.called;
        });
    });
});
