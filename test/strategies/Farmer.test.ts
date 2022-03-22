import { MockContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";
import { parseEther } from "ethers/lib/utils";
import hre from "hardhat";

import { FARMER_DID } from "../../deploy/41_deployFarmer";
import { IExtendedHRE } from "../../packages/HardhatRegistryExtension/ExtendedHRE";
import { IExodiaContractsRegistry } from "../../packages/sdk/contracts/exodiaContracts";
import {
    AllocatedRiskFreeValue,
    AllocatedRiskFreeValue__factory,
    AllocationCalculator,
    AllocationCalculator__factory,
    AssetAllocator,
    AssetAllocator__factory,
    ExodiaRoles,
    ExodiaRoles__factory,
    Farmer,
    Farmer__factory,
    MockAssetAllocator,
    MockAssetAllocator__factory,
    MockToken,
    MockToken__factory,
    OlympusTreasury,
    OlympusTreasury__factory,
    TreasuryDepositor,
    TreasuryDepositor__factory,
} from "../../packages/sdk/typechain";
import mint from "../../packages/utils/mint";
import toggleRights, { MANAGING } from "../../packages/utils/toggleRights";
import "../chai-setup";
import { increaseTime } from "../testUtils";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;

describe("Farmer", function () {
    let deployer: SignerWithAddress;
    let otherAccount: SignerWithAddress;

    let farmer: Farmer;
    let token0: MockContract<MockToken>;
    let token1: MockContract<MockToken>;
    let roles: ExodiaRoles;
    let treasury: OlympusTreasury;
    let allocationCalculator: AllocationCalculator;
    let treasuryDepositor: TreasuryDepositor;
    let arfv: AllocatedRiskFreeValue;

    const setup = deployments.createFixture(async (hh) => {
        await deployments.fixture([FARMER_DID]);
        const rolesDeployment = await get<ExodiaRoles__factory>("ExodiaRoles");
        roles = rolesDeployment.contract;
        const treasuryDeployment = await get<OlympusTreasury__factory>("OlympusTreasury");
        treasury = treasuryDeployment.contract;
        const allocationCalculatorDeployment = await get<AllocationCalculator__factory>(
            "AllocationCalculator"
        );
        allocationCalculator = allocationCalculatorDeployment.contract;
        const treasuryDepositorDeployment = await get<TreasuryDepositor__factory>(
            "TreasuryDepositor"
        );
        treasuryDepositor = treasuryDepositorDeployment.contract;
        const arfvDeployment = await get<AllocatedRiskFreeValue__factory>(
            "AllocatedRiskFreeValue"
        );
        arfv = arfvDeployment.contract;
        const farmerDeployment = await get<Farmer__factory>("Farmer");
        farmer = farmerDeployment.contract;
        const tokenFactory = await smock.mock<MockToken__factory>("MockToken");
        token0 = await tokenFactory.deploy(18);
        token1 = await tokenFactory.deploy(7);
    });

    beforeEach(async function () {
        const { deployer: deployerAddress } = await getNamedAccounts();
        const [address0] = await getUnnamedAccounts();
        deployer = await xhre.ethers.getSigner(deployerAddress);
        otherAccount = await xhre.ethers.getSigner(address0);
        await setup();
    });

    describe("limits", function () {
        const relativeLimit = 50_000;
        const maxAlloc = parseEther("1000");
        const reserve = parseEther("200");

        const setupLimit = deployments.createFixture(async (hh) => {
            await roles.addStrategist(deployer.address);
            await farmer.setLimit(token0.address, relativeLimit, maxAlloc, reserve);
        });

        beforeEach(async function () {
            await setupLimit();
        });

        it("Should use relative allocation", async function () {
            const balance = parseEther("800");
            await token0.mint(treasury.address, balance);
            expect(await farmer.getLimit(token0.address)).to.eq(balance.div(2));
        });

        it("Should be capped at max allocation", async function () {
            const balance = parseEther("3000");
            await token0.mint(treasury.address, balance);
            expect(await farmer.getLimit(token0.address)).to.eq(maxAlloc);
        });

        it("Should have no limit", async function () {
            await farmer.setLimit(token0.address, 100_000, 0, 0);
            const balance = parseEther("800");
            await token0.mint(treasury.address, balance);
            expect(await farmer.getLimit(token0.address)).to.eq(balance);
        });

        it("Should keep the reserve amount", async function () {
            await farmer.setLimit(token0.address, 100_000, 0, reserve);
            const balance = parseEther("800");
            await token0.mint(treasury.address, balance);
            expect(await farmer.getLimit(token0.address)).to.eq(balance.sub(reserve));
        });
    });

    describe("rebalance", function () {
        const balance = parseEther("100000");

        const setupRebalanceTest = deployments.createFixture(async (hh) => {
            await roles.addStrategist(deployer.address);
            await farmer.setLimit(token0.address, 100_000, 0, 0);
            await toggleRights(treasury, MANAGING.RESERVETOKEN, token0.address);
            await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, deployer.address);
            await token0.mint(deployer.address, balance);
            await token0.approve(treasury.address, balance);
            await treasury.deposit(balance, token0.address, balance.div(1e9));
        });

        beforeEach(async function () {
            await setupRebalanceTest();
        });

        it("Should allocate the balance", async function () {
            await farmer.rebalance(token0.address);
            expect(await token0.balanceOf(farmer.address)).to.eq(0);
            expect(await token0.balanceOf(treasury.address)).to.eq(0);
            expect(await arfv.balanceOf(farmer.address)).to.eq(balance.div(1e9));
        });

        describe("With mock allocator", function () {
            let mockAllocator: MockContract<MockAssetAllocator>;

            const setupMock = deployments.createFixture(async (hh) => {
                const mockAllocatorFactory =
                    await smock.mock<MockAssetAllocator__factory>("MockAssetAllocator");
                mockAllocator = await mockAllocatorFactory.deploy();
                await farmer.setAllocator(mockAllocator.address);
                await farmer.rebalance(token0.address);
            });

            beforeEach(async function () {
                await setupMock();
            });

            const assertExpectedBalance = async (
                treasuryBal: BigNumberish,
                arfvBal: BigNumberish
            ) => {
                expect(await token0.balanceOf(farmer.address)).to.eq(0);
                expect(await token0.balanceOf(treasury.address)).to.eq(treasuryBal);
                expect(await arfv.balanceOf(treasury.address)).to.eq(arfvBal);
            };

            const runTest = (delta: BigNumberish) => {
                it("Should allocate the balance", async function () {
                    await assertExpectedBalance(delta, balance.div(1e9));
                });

                it("Should be status quo", async function () {
                    await farmer.rebalance(token0.address);
                    await assertExpectedBalance(0, balance.add(delta).div(1e9));
                });

                it("Should update ARFV loss", async function () {
                    const lostAmount = parseEther("1000");
                    await mockAllocator.loose(token0.address, lostAmount);
                    await farmer.rebalance(token0.address);
                    await assertExpectedBalance(
                        0,
                        balance.add(delta).sub(lostAmount).div(1e9)
                    );
                });

                it("Should update ARFV gained", async function () {
                    const gains = parseEther("1000");
                    await mockAllocator.profits(token0.address, gains);
                    await farmer.rebalance(token0.address);
                    await assertExpectedBalance(
                        0,
                        balance.add(delta).add(gains).div(1e9)
                    );
                });

                it("Should return withdrawn funds", async function () {
                    await farmer.setLimit(token0.address, 50_000, 0, 0);
                    await farmer.rebalance(token0.address);
                    const newBalance = balance.add(delta);
                    await assertExpectedBalance(
                        newBalance.div(2),
                        newBalance.div(2).div(1e9)
                    );
                });

                it("Should handle loss from slippage", async function () {
                    await farmer.setLimit(token0.address, 50_000, 0, 0);
                    const slippage = parseEther("1");
                    await mockAllocator.slip(token0.address, slippage);
                    await farmer.rebalance(token0.address);
                    const newBalance = balance.add(delta);
                    await assertExpectedBalance(
                        newBalance.div(2).sub(slippage),
                        newBalance.div(2).div(1e9)
                    );
                });

                it("Should handle gains from slippage", async function () {
                    await farmer.setLimit(token0.address, 50_000, 0, 0);
                    const slippage = parseEther("-1");
                    await mockAllocator.slip(token0.address, slippage);
                    await farmer.rebalance(token0.address);
                    const newBalance = balance.add(delta);
                    await assertExpectedBalance(
                        newBalance.div(2).sub(slippage),
                        newBalance.div(2).div(1e9)
                    );
                });
            };

            runTest(BigNumber.from(0));

            describe("Adding funds", function () {
                const newFunds = parseEther("2000");
                beforeEach(async function () {
                    await token0.mint(deployer.address, newFunds);
                    await token0.approve(treasury.address, newFunds);
                    await treasury.deposit(newFunds, token0.address, newFunds.div(1e9));
                });

                runTest(newFunds);
            });
        });
    });

    describe.only("Allocate", async function () {
        let mockAllocator: MockContract<MockAssetAllocator>;
        const balance = parseEther("100000");
        const setupMock = deployments.createFixture(async (hh) => {
            await roles.addStrategist(deployer.address);
            await farmer.setLimit(token0.address, 100_000, 0, 0);
            await toggleRights(treasury, MANAGING.RESERVETOKEN, token0.address);
            await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, deployer.address);
            await token0.mint(deployer.address, balance);
            await token0.approve(treasury.address, balance);
            await treasury.deposit(balance, token0.address, balance.div(1e9));
            const mockAllocatorFactory = await smock.mock<MockAssetAllocator__factory>(
                "MockAssetAllocator"
            );
            mockAllocator = await mockAllocatorFactory.deploy();
            await farmer.setAllocator(mockAllocator.address);
            await farmer.rebalance(token0.address);
        });

        beforeEach(async function () {
            await setupMock();
        });

        const assertExpectedBalance = async (
            treasuryBal: BigNumberish,
            arfvBal: BigNumberish
        ) => {
            expect(await token0.balanceOf(farmer.address)).to.eq(0);
            expect(await token0.balanceOf(treasury.address)).to.eq(treasuryBal);
            expect(await arfv.balanceOf(treasury.address)).to.eq(arfvBal);
        };

        it("Should not withdraw to treasury on loss", async function () {
            const looseAmount = parseEther("10");
            await mockAllocator.loose(token0.address, looseAmount);
            await farmer.allocate(token0.address);
            await assertExpectedBalance(0, balance.div(1e9));
        });

        it("Should add allocation", async function () {
            const mintAmount = parseEther("10");
            await token0.mint(deployer.address, mintAmount);
            await token0.approve(treasury.address, mintAmount);
            await treasury.deposit(mintAmount, token0.address, mintAmount.div(1e9));
            await farmer.allocate(token0.address);
            await assertExpectedBalance(0, balance.add(mintAmount).div(1e9));
        });

        it("Should add allocation even if losses", async function () {
            const mintAmount = parseEther("10");
            await token0.mint(deployer.address, mintAmount);
            await token0.approve(treasury.address, mintAmount);
            await treasury.deposit(mintAmount, token0.address, mintAmount.div(1e9));
            const looseAmount = parseEther("10");
            await mockAllocator.loose(token0.address, looseAmount);
            await farmer.allocate(token0.address);
            await assertExpectedBalance(0, balance.add(mintAmount).div(1e9));
        });
    });

    describe("rebalance cooldown", function () {
        let mockAllocator: MockContract<MockAssetAllocator>;
        const setUpRebalanceCooldown = deployments.createFixture(async (hh) => {
            const mockAllocatorFactory = await smock.mock<MockAssetAllocator__factory>(
                "MockAssetAllocator"
            );
            mockAllocator = await mockAllocatorFactory.deploy();
            await roles.addStrategist(deployer.address);
            await farmer.setAllocator(mockAllocator.address);
            await farmer.setMinElapsedTimeRebalance(1000);
            await farmer.rebalance(token0.address);
        });
        beforeEach(async function () {
            await setUpRebalanceCooldown();
        });

        it("Should not let rebalance happen if cool down active", async function () {
            expect(farmer.rebalance(token0.address)).to.be.revertedWith(
                "Farmer: cool down active"
            );
        });

        it("Should have 1 rebalance cooldown per token", async function () {
            expect(farmer.rebalance(token1.address)).not.reverted;
        });

        it("Should let rebalance after cool down time passed", async function () {
            await increaseTime(hre, 1000);
            expect(farmer.rebalance(token0.address)).not.reverted;
        });

        it("Should let force rebalance bypass cooldown", async function () {
            expect(farmer.forceRebalance(token0.address)).not.reverted;
        });
    });

    describe("Harvest", async function () {
        let mockAllocator: MockContract<MockAssetAllocator>;

        const setupMock = deployments.createFixture(async (hh) => {
            const mockAllocatorFactory = await smock.mock<MockAssetAllocator__factory>(
                "MockAssetAllocator"
            );
            mockAllocator = await mockAllocatorFactory.deploy();
            await farmer.setAllocator(mockAllocator.address);
            await farmer.rebalance(token0.address);
        });

        beforeEach(async function () {
            await setupMock();
        });

        it("Should call AssetAllocator collectRewards function", async function () {
            await farmer.harvest(token0.address);
            expect(mockAllocator.collectRewards).to.have.been.calledWith(token0.address);
        });
    });

    describe("As Strategists", function () {
        let strategistFarmer: Farmer;

        beforeEach(async () => {
            await roles.addStrategist(otherAccount.address);
            strategistFarmer = Farmer__factory.connect(farmer.address, otherAccount);
        });

        it("Should be able to setLimit", async function () {
            await strategistFarmer.setLimit(
                token0.address,
                50_000,
                parseEther("1.1"),
                parseEther("0")
            );
        });

        it("Should be able to update cooldown", async function () {
            await strategistFarmer.setMinElapsedTimeRebalance(1000);
        });

        it("Should be able to use forceRebalance", async function () {
            await strategistFarmer.forceRebalance(token0.address);
        });
    });

    describe("As Architects", function () {
        let architectFarmer: Farmer;

        beforeEach(async () => {
            await roles.addArchitect(otherAccount.address);
            architectFarmer = Farmer__factory.connect(farmer.address, otherAccount);
        });

        it("Should be able to update treasury manager", async function () {
            await architectFarmer.setTreasuryManager(deployer.address);
            expect(await architectFarmer.treasuryManagerAddress()).to.eq(
                deployer.address
            );
        });

        it("Should be able to update treasury depositor", async function () {
            await architectFarmer.setTreasuryDepositor(deployer.address);
            expect(await architectFarmer.treasuryDepositorAddress()).to.eq(
                deployer.address
            );
        });

        it("Should be able to update allocator", async function () {
            await architectFarmer.setAllocator(deployer.address);
            expect(await architectFarmer.allocator()).to.eq(deployer.address);
        });
    });

    describe("As noone", function () {
        const CALLER_NOT_STRATEGIST = "caller is not a strategist";
        const CALLER_NOT_ARCHITECT = "caller is not an architect";

        let externalFarmer: Farmer;

        beforeEach(async () => {
            externalFarmer = Farmer__factory.connect(farmer.address, otherAccount);
        });

        it("Should not be able to setLimit", async function () {
            expect(
                externalFarmer.setLimit(
                    token0.address,
                    50_000,
                    parseEther("1.1"),
                    parseEther("0")
                )
            ).to.be.revertedWith(CALLER_NOT_STRATEGIST);
        });

        it("Should not be able to update cooldown", async function () {
            expect(externalFarmer.setMinElapsedTimeRebalance(1000)).to.be.revertedWith(
                CALLER_NOT_STRATEGIST
            );
        });

        it("Should not be able to use forceRebalance", async function () {
            expect(externalFarmer.forceRebalance(token0.address)).to.be.revertedWith(
                CALLER_NOT_STRATEGIST
            );
        });

        it("Should not be able to setTreasuryManager", async function () {
            expect(
                externalFarmer.setTreasuryManager(deployer.address)
            ).to.be.revertedWith(CALLER_NOT_ARCHITECT);
        });

        it("Should not be able to setTreasuryDepositor", async function () {
            expect(
                externalFarmer.setTreasuryDepositor(deployer.address)
            ).to.be.revertedWith(CALLER_NOT_ARCHITECT);
        });

        it("Should not be able to update allocator", async function () {
            expect(externalFarmer.setAllocator(deployer.address)).to.be.revertedWith(
                CALLER_NOT_ARCHITECT
            );
        });

        it("Should be able to call rebalance", async function () {
            await externalFarmer.rebalance(token0.address);
        });
    });
});
