import { MockContract, MockContractFactory, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import hre from "hardhat";
import { ASSET_ALLOCATOR_DID } from "../../deploy/30_deployAssetAllocator";
import { IExodiaContractsRegistry } from "../../src/contracts/exodiaContracts";
import { IExtendedHRE } from "../../src/HardhatRegistryExtension/ExtendedHRE";
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
    MockGreedyStrategy,
    MockGreedyStrategy__factory,
    MockLoosingStrategy,
    MockLoosingStrategy__factory,
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
} from "../../typechain";
import "../chai-setup";
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
        const { contract: roles } = await get<ExodiaRoles__factory>("ExodiaRoles");
        await roles.addArchitect(deployer);
        await roles.addStrategist(deployer);
        await assetAllocator.addMachine(deployer);
        mockStrategyFactory = await smock.mock<MockStrategy__factory>("MockStrategy");
        strategy = await mockStrategyFactory.deploy(assetAllocator.address);
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
                loosingStrat = await mockLoosingStrategyFactory.deploy(
                    assetAllocator.address,
                    returnRate
                );
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
                    deployedAmount.add(newDeposit).mul(returnRate).div(100)
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
            const factories = [mockStrategyFactory, mockGreedyStrategyFactory];
            let strat0: MockContract<MockStrategy>;
            let strat1: MockContract<MockStrategy>;
            let balanceTotal = mintAmount;

            const amountAlloc = (allocTo: number) =>
                balanceTotal.mul(allocTo).div(maxAlloc);

            const amountAllocReturned = (returnRate: number) => (allocTo: number) =>
                balanceTotal.mul(returnRate).div(100).mul(allocTo).div(maxAlloc);

            const loss = (lossPercent: number) => (amount: BigNumber) =>
                amount.mul(lossPercent).div(100);

            beforeEach(async function () {
                balanceTotal = mintAmount;
            });

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
                balance0: (alloc: number) => BigNumber,
                balance1: (alloc: number) => BigNumber,
                loss0: (withdrawn: BigNumber) => BigNumber,
                loss1: (withdrawn: BigNumber) => BigNumber
            ) => {
                it("Should return total balance", async function () {
                    expect(await assetAllocator.allocatedBalance(dai.address)).eq(
                        balance0(alloc0).add(balance1(alloc1))
                    );
                });

                it("Should allocate between multiples", async function () {
                    const amountStrat0 = balance0(alloc0);
                    const amountStrat1 = balance1(alloc1);
                    await expectProperAllocation(amountStrat0, amountStrat1);
                });

                it("Should rebalance if loss/profits", async function () {
                    balanceTotal = balance0(alloc0).add(balance1(alloc1));
                    await dai.approve(assetAllocator.address, balanceTotal);
                    await assetAllocator.rebalance(dai.address, balanceTotal);
                    await expectProperAllocation(balance0(alloc0), balance1(alloc1));
                });

                it("Should reallocate higher-lower", async function () {
                    const newAlloc0 = 40_000;
                    const newAlloc1 = 60_000;
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [newAlloc0, newAlloc1]
                    );
                    balanceTotal = balance0(alloc0).add(balance1(alloc1));
                    await dai.approve(assetAllocator.address, balanceTotal);
                    await assetAllocator.rebalance(dai.address, balanceTotal);
                    const amountWithdrawn0 = balance0(alloc0 - newAlloc0);
                    const amountWithdrawn1 = balance1(alloc1 - newAlloc1);
                    const amountLoss0 = loss0(amountWithdrawn0);
                    const amountLoss1 = loss1(amountWithdrawn1);
                    let amount0 = balance0(newAlloc0);
                    let amount1 = balance1(newAlloc1);
                    if (amountLoss0.gt(0)) {
                        amount1 = amount1.sub(amountLoss0);
                    }
                    if (amountLoss1.gt(0)) {
                        amount0 = amount0.sub(amountLoss1);
                    }
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
                    balanceTotal = balance0(alloc0).add(balance1(alloc1));
                    await dai.approve(assetAllocator.address, balanceTotal);
                    await assetAllocator.rebalance(dai.address, balanceTotal);
                    const amountWithdrawn0 = balance0(alloc0 - newAlloc0);
                    const amountWithdrawn1 = balance1(alloc1 - newAlloc1);
                    const amountLoss0 = loss0(amountWithdrawn0);
                    const amountLoss1 = loss1(amountWithdrawn1);
                    let amount0 = balance0(newAlloc0);
                    let amount1 = balance1(newAlloc1);
                    if (amountLoss0.gt(0)) {
                        amount1 = amount1.sub(amountLoss0);
                    }
                    if (amountLoss1.gt(0)) {
                        amount0 = amount0.sub(amountLoss1);
                    }
                    await expectProperAllocation(amount0, amount1);
                });

                it("Should add tokens", async function () {
                    balanceTotal = balance0(alloc0).add(balance1(alloc1));
                    const newDeposit = parseUnits("1000", "ether");
                    await dai.mint(deployer, newDeposit);
                    balanceTotal = balanceTotal.add(newDeposit);
                    await dai.approve(assetAllocator.address, balanceTotal);
                    await assetAllocator.rebalance(dai.address, balanceTotal);
                    await expectProperAllocation(balance0(alloc0), balance1(alloc1));
                });

                it("Should withdraw tokens", async function () {
                    balanceTotal = balance0(alloc0).add(balance1(alloc1)).div(2);
                    const amountStrat0 = balance0(alloc0);
                    const amountStrat1 = balance1(alloc1);
                    await dai.approve(assetAllocator.address, balanceTotal);
                    await assetAllocator.rebalance(dai.address, balanceTotal);
                    const amountWithdrawn0 = balance0(alloc0);
                    const amountWithdrawn1 = balance1(alloc1);
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
                    const balanceBefore0 = balance0(alloc0);
                    const balanceBefore1 = balance1(alloc1);
                    balanceTotal = balance0(alloc0).add(balance1(alloc1));
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
                    let amount0 = balance0(newAlloc0);
                    let amount1 = balance1(newAlloc1);
                    const amountLoss0 = loss0(balanceBefore0.sub(amount0));
                    const amountLoss1 = loss1(balanceBefore1.sub(amount1));
                    if (amountLoss0.gt(0)) {
                        amount1 = amount1.sub(amountLoss0);
                    }
                    if (amountLoss1.gt(0)) {
                        amount0 = amount0.sub(amountLoss1);
                    }
                    await expectProperAllocation(amount0, amount1);
                });

                it("Should remove and reallocate", async function () {
                    const balanceBefore0 = balance0(alloc0);
                    const balanceBefore1 = balance1(alloc1);
                    balanceTotal = balance0(alloc0).add(balance1(alloc1)).div(2);
                    const newAlloc0 = 40_000;
                    const newAlloc1 = 60_000;
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [newAlloc0, newAlloc1]
                    );
                    await dai.approve(assetAllocator.address, balanceTotal);
                    await assetAllocator.rebalance(dai.address, balanceTotal);
                    const amountWithdrawn0 = balanceBefore0.sub(balance0(newAlloc0));
                    const amountWithdrawn1 = balanceBefore1.sub(balance1(newAlloc1));
                    const amountLoss0 = loss0(amountWithdrawn0);
                    const amountLoss1 = loss1(amountWithdrawn1);
                    await expectProperAllocation(
                        balance0(newAlloc0),
                        balance1(newAlloc1),
                        balanceTotal.sub(amountLoss0).sub(amountLoss1)
                    );
                });
            };

            describe("For regulars strategies", function () {
                const setupRegularRegular = deployments.createFixture(async (hh) => {
                    strat0 = await mockStrategyFactory.deploy(assetAllocator.address);
                    strat1 = await mockStrategyFactory.deploy(assetAllocator.address);
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [alloc0, alloc1]
                    );
                    await assetAllocator.rebalance(dai.address, balanceTotal);
                });

                beforeEach(async function () {
                    await setupRegularRegular();
                });

                testAllocations(amountAlloc, amountAlloc, loss(0), loss(0));
            });

            describe("For regular-loosing strategies", function () {
                const returnRate = 80;

                const setupRegularLoosing = deployments.createFixture(async (hh) => {
                    strat0 = await mockStrategyFactory.deploy(assetAllocator.address);
                    strat1 = await mockLoosingStrategyFactory.deploy(
                        assetAllocator.address,
                        80
                    );
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [alloc0, alloc1]
                    );
                    await assetAllocator.rebalance(dai.address, balanceTotal);
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
                    strat0 = await mockLoosingStrategyFactory.deploy(
                        assetAllocator.address,
                        returnRate0
                    );
                    strat1 = await mockLoosingStrategyFactory.deploy(
                        assetAllocator.address,
                        returnRate1
                    );
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [alloc0, alloc1]
                    );
                    await assetAllocator.rebalance(dai.address, balanceTotal);
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
                    strat1 = await mockStrategyFactory.deploy(assetAllocator.address);
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [alloc0, alloc1]
                    );
                    await dai.addAuth(strat0.address);
                    await assetAllocator.rebalance(dai.address, balanceTotal);
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
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [alloc0, alloc1]
                    );
                    await dai.addAuth(strat0.address);
                    await dai.addAuth(strat1.address);
                    await assetAllocator.rebalance(dai.address, balanceTotal);
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
                    strat0 = await mockLoosingStrategyFactory.deploy(
                        assetAllocator.address,
                        returnRate0
                    );
                    strat1 = await mockWinningStrategyFactory.deploy(
                        assetAllocator.address,
                        dai.address,
                        returnRate1
                    );
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [alloc0, alloc1]
                    );
                    await dai.addAuth(strat1.address);
                    await assetAllocator.rebalance(dai.address, balanceTotal);
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
                    strat0 = await mockStrategyFactory.deploy(assetAllocator.address);
                    strat1 = await mockGreedyStrategyFactory.deploy(
                        assetAllocator.address,
                        returnRate1
                    );
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [alloc0, alloc1]
                    );
                    await assetAllocator.rebalance(dai.address, balanceTotal);
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
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [alloc0, alloc1]
                    );
                    await assetAllocator.rebalance(dai.address, balanceTotal);
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

            describe.only("For winning-slipping strategies", function () {
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
                    await allocationCalculator.setAllocation(
                        dai.address,
                        [strat0.address, strat1.address],
                        [alloc0, alloc1]
                    );
                    await dai.addAuth(strat0.address);
                    await assetAllocator.rebalance(dai.address, balanceTotal);
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
    /*
        describe("Rebalance from loosing strategy", async function () {
            let loosingStrategy: MockContract<MockLoosingStrategy>;
            const returnRate = BigNumber.from("20");
            beforeEach(async function () {
                loosingStrategy = await mockLoosingStrategyFactory.deploy(
                    assetAllocator.address,
                    returnRate
                );
                await allocationCalculator.setAllocation(
                    dai.address,
                    [loosingStrategy.address],
                    [50_000]
                );
                await assetAllocator.rebalance(dai.address);
            });

            it("Should reallocate and reduce excess reserve", async function () {
                await allocationCalculator.setAllocation(
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
                const allocated = await assetAllocator.allocatedTokens(dai.address);
                expect(allocated).to.eq(stratBalance);
            });

            it("Should withdraw to rebalance and reduce excess reserve", async function () {
                await allocationCalculator.setAllocation(
                    dai.address,
                    [loosingStrategy.address, strategy.address],
                    [50_000, 50_000]
                );
                await assetAllocator.rebalance(dai.address);
                const deployedAmount = daiTreasuryBalance0.mul(50_000).div(100_000);
                const lostAmount = deployedAmount.sub(
                    deployedAmount.mul(returnRate).div(100)
                );
                const amountLeft = daiTreasuryBalance0.sub(lostAmount);
                const stratBalance = await dai.balanceOf(strategy.address);
                const treasuryBalance = await dai.balanceOf(treasury.address);
                expect(stratBalance).to.eq(amountLeft.div(2));
                expect(treasuryBalance).to.eq(0);
                const allocated = await assetAllocator.allocatedTokens(dai.address);
                expect(allocated).to.eq(amountLeft);
            });
        });
    });

    describe("Time between rebalance", async function () {
        beforeEach(async function () {
            await assetAllocator.setMinElapsedTimeRebalance(1000);
            await assetAllocator.rebalance(dai.address);
        });

        it("Should not let rebalance", async function () {
            expect(assetAllocator.rebalance(dai.address)).to.be.revertedWith(
                "Exceeding rebalance time treshold"
            );
        });

        it("Should let rebalance after min time", async function () {
            await increaseTime(hre, 1000);
            await assetAllocator.rebalance(dai.address);
        });

        it("Should let policy force rebalance", async function () {
            await assetAllocator.forceRebalance(dai.address);
        });

        it("Should revert if not policy updates min. time", async function () {
            const allocator = AssetAllocator__factory.connect(
                assetAllocator.address,
                randomSigner
            );
            expect(allocator.setMinElapsedTimeRebalance(100)).to.be.revertedWith(
                "caller is not an architect"
            );
        });
    });*/
});
