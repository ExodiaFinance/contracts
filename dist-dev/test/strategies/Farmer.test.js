"use strict";
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              Object.defineProperty(o, k2, {
                  enumerable: true,
                  get: function () {
                      return m[k];
                  },
              });
          }
        : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              o[k2] = m[k];
          });
var __setModuleDefault =
    (this && this.__setModuleDefault) ||
    (Object.create
        ? function (o, v) {
              Object.defineProperty(o, "default", { enumerable: true, value: v });
          }
        : function (o, v) {
              o["default"] = v;
          });
var __importStar =
    (this && this.__importStar) ||
    function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
                    __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const smock_1 = require("@defi-wonderland/smock");
const chai_1 = require("chai");
const ethers_1 = require("ethers");
const utils_1 = require("ethers/lib/utils");
const hardhat_1 = __importDefault(require("hardhat"));
const _41_deployFarmer_1 = require("../../deploy/41_deployFarmer");
const typechain_1 = require("../../packages/sdk/typechain");
const toggleRights_1 = __importStar(require("../../packages/utils/toggleRights"));
require("../chai-setup");
const testUtils_1 = require("../testUtils");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;
describe("Farmer", function () {
    let deployer;
    let otherAccount;
    let farmer;
    let token0;
    let token1;
    let roles;
    let treasury;
    let allocationCalculator;
    let treasuryDepositor;
    let arfv;
    const setup = deployments.createFixture(async (hh) => {
        await deployments.fixture([_41_deployFarmer_1.FARMER_DID]);
        const rolesDeployment = await get("ExodiaRoles");
        roles = rolesDeployment.contract;
        const treasuryDeployment = await get("OlympusTreasury");
        treasury = treasuryDeployment.contract;
        const allocationCalculatorDeployment = await get("AllocationCalculator");
        allocationCalculator = allocationCalculatorDeployment.contract;
        const treasuryDepositorDeployment = await get("TreasuryDepositor");
        treasuryDepositor = treasuryDepositorDeployment.contract;
        const arfvDeployment = await get("AllocatedRiskFreeValue");
        arfv = arfvDeployment.contract;
        const farmerDeployment = await get("Farmer");
        farmer = farmerDeployment.contract;
        const tokenFactory = await smock_1.smock.mock("MockToken");
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
        const relativeLimit = 50000;
        const maxAlloc = (0, utils_1.parseEther)("1000");
        const reserve = (0, utils_1.parseEther)("200");
        const setupLimit = deployments.createFixture(async (hh) => {
            await roles.addStrategist(deployer.address);
            await farmer.setLimit(token0.address, relativeLimit, maxAlloc, reserve);
        });
        beforeEach(async function () {
            await setupLimit();
        });
        it("Should use relative allocation", async function () {
            const balance = (0, utils_1.parseEther)("800");
            await token0.mint(treasury.address, balance);
            (0, chai_1.expect)(await farmer.getLimit(token0.address)).to.eq(
                balance.div(2)
            );
        });
        it("Should be capped at max allocation", async function () {
            const balance = (0, utils_1.parseEther)("3000");
            await token0.mint(treasury.address, balance);
            (0, chai_1.expect)(await farmer.getLimit(token0.address)).to.eq(maxAlloc);
        });
        it("Should have no limit", async function () {
            await farmer.setLimit(token0.address, 100000, 0, 0);
            const balance = (0, utils_1.parseEther)("800");
            await token0.mint(treasury.address, balance);
            (0, chai_1.expect)(await farmer.getLimit(token0.address)).to.eq(balance);
        });
        it("Should keep the reserve amount", async function () {
            await farmer.setLimit(token0.address, 100000, 0, reserve);
            const balance = (0, utils_1.parseEther)("800");
            await token0.mint(treasury.address, balance);
            (0, chai_1.expect)(await farmer.getLimit(token0.address)).to.eq(
                balance.sub(reserve)
            );
        });
    });
    describe("rebalance", function () {
        const balance = (0, utils_1.parseEther)("100000");
        const setupRebalanceTest = deployments.createFixture(async (hh) => {
            await roles.addStrategist(deployer.address);
            await farmer.setLimit(token0.address, 100000, 0, 0);
            await (0, toggleRights_1.default)(
                treasury,
                toggleRights_1.MANAGING.RESERVETOKEN,
                token0.address
            );
            await (0, toggleRights_1.default)(
                treasury,
                toggleRights_1.MANAGING.RESERVEDEPOSITOR,
                deployer.address
            );
            await token0.mint(deployer.address, balance);
            await token0.approve(treasury.address, balance);
            await treasury.deposit(balance, token0.address, balance.div(1e9));
        });
        beforeEach(async function () {
            await setupRebalanceTest();
        });
        it("Should allocate the balance", async function () {
            await farmer.rebalance(token0.address);
            (0, chai_1.expect)(await token0.balanceOf(farmer.address)).to.eq(0);
            (0, chai_1.expect)(await token0.balanceOf(treasury.address)).to.eq(0);
            (0, chai_1.expect)(await arfv.balanceOf(farmer.address)).to.eq(
                balance.div(1e9)
            );
        });
        describe("With mock allocator", function () {
            let mockAllocator;
            const setupMock = deployments.createFixture(async (hh) => {
                const mockAllocatorFactory = await smock_1.smock.mock(
                    "MockAssetAllocator"
                );
                mockAllocator = await mockAllocatorFactory.deploy();
                await farmer.setAllocator(mockAllocator.address);
                await farmer.rebalance(token0.address);
            });
            beforeEach(async function () {
                await setupMock();
            });
            const assertExpectedBalance = async (treasuryBal, arfvBal) => {
                (0, chai_1.expect)(await token0.balanceOf(farmer.address)).to.eq(0);
                (0, chai_1.expect)(await token0.balanceOf(treasury.address)).to.eq(
                    treasuryBal
                );
                (0, chai_1.expect)(await arfv.balanceOf(treasury.address)).to.eq(arfvBal);
            };
            const runTest = (delta) => {
                it("Should allocate the balance", async function () {
                    await assertExpectedBalance(delta, balance.div(1e9));
                });
                it("Should be status quo", async function () {
                    await farmer.rebalance(token0.address);
                    await assertExpectedBalance(0, balance.add(delta).div(1e9));
                });
                it("Should update ARFV loss", async function () {
                    const lostAmount = (0, utils_1.parseEther)("1000");
                    await mockAllocator.loose(token0.address, lostAmount);
                    await farmer.rebalance(token0.address);
                    await assertExpectedBalance(
                        0,
                        balance.add(delta).sub(lostAmount).div(1e9)
                    );
                });
                it("Should update ARFV gained", async function () {
                    const gains = (0, utils_1.parseEther)("1000");
                    await mockAllocator.profits(token0.address, gains);
                    await farmer.rebalance(token0.address);
                    await assertExpectedBalance(
                        0,
                        balance.add(delta).add(gains).div(1e9)
                    );
                });
                it("Should return withdrawn funds", async function () {
                    await farmer.setLimit(token0.address, 50000, 0, 0);
                    await farmer.rebalance(token0.address);
                    const newBalance = balance.add(delta);
                    await assertExpectedBalance(
                        newBalance.div(2),
                        newBalance.div(2).div(1e9)
                    );
                });
                it("Should handle loss from slippage", async function () {
                    await farmer.setLimit(token0.address, 50000, 0, 0);
                    const slippage = (0, utils_1.parseEther)("1");
                    await mockAllocator.slip(token0.address, slippage);
                    await farmer.rebalance(token0.address);
                    const newBalance = balance.add(delta);
                    await assertExpectedBalance(
                        newBalance.div(2).sub(slippage),
                        newBalance.div(2).div(1e9)
                    );
                });
                it("Should handle gains from slippage", async function () {
                    await farmer.setLimit(token0.address, 50000, 0, 0);
                    const slippage = (0, utils_1.parseEther)("-1");
                    await mockAllocator.slip(token0.address, slippage);
                    await farmer.rebalance(token0.address);
                    const newBalance = balance.add(delta);
                    await assertExpectedBalance(
                        newBalance.div(2).sub(slippage),
                        newBalance.div(2).div(1e9)
                    );
                });
            };
            runTest(ethers_1.BigNumber.from(0));
            describe("Adding funds", function () {
                const newFunds = (0, utils_1.parseEther)("2000");
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
        let mockAllocator;
        const balance = (0, utils_1.parseEther)("100000");
        const setupMock = deployments.createFixture(async (hh) => {
            await roles.addStrategist(deployer.address);
            await farmer.setLimit(token0.address, 100000, 0, 0);
            await (0, toggleRights_1.default)(
                treasury,
                toggleRights_1.MANAGING.RESERVETOKEN,
                token0.address
            );
            await (0, toggleRights_1.default)(
                treasury,
                toggleRights_1.MANAGING.RESERVEDEPOSITOR,
                deployer.address
            );
            await token0.mint(deployer.address, balance);
            await token0.approve(treasury.address, balance);
            await treasury.deposit(balance, token0.address, balance.div(1e9));
            const mockAllocatorFactory = await smock_1.smock.mock("MockAssetAllocator");
            mockAllocator = await mockAllocatorFactory.deploy();
            await farmer.setAllocator(mockAllocator.address);
            await farmer.rebalance(token0.address);
        });
        beforeEach(async function () {
            await setupMock();
        });
        const assertExpectedBalance = async (treasuryBal, arfvBal) => {
            (0, chai_1.expect)(await token0.balanceOf(farmer.address)).to.eq(0);
            (0, chai_1.expect)(await token0.balanceOf(treasury.address)).to.eq(
                treasuryBal
            );
            (0, chai_1.expect)(await arfv.balanceOf(treasury.address)).to.eq(arfvBal);
        };
        it("Should not withdraw to treasury on loss", async function () {
            const looseAmount = (0, utils_1.parseEther)("10");
            await mockAllocator.loose(token0.address, looseAmount);
            await farmer.allocate(token0.address);
            await assertExpectedBalance(0, balance.div(1e9));
        });
        it("Should add allocation", async function () {
            const mintAmount = (0, utils_1.parseEther)("10");
            await token0.mint(deployer.address, mintAmount);
            await token0.approve(treasury.address, mintAmount);
            await treasury.deposit(mintAmount, token0.address, mintAmount.div(1e9));
            await farmer.allocate(token0.address);
            await assertExpectedBalance(0, balance.add(mintAmount).div(1e9));
        });
        it("Should add allocation even if losses", async function () {
            const mintAmount = (0, utils_1.parseEther)("10");
            await token0.mint(deployer.address, mintAmount);
            await token0.approve(treasury.address, mintAmount);
            await treasury.deposit(mintAmount, token0.address, mintAmount.div(1e9));
            const looseAmount = (0, utils_1.parseEther)("10");
            await mockAllocator.loose(token0.address, looseAmount);
            await farmer.allocate(token0.address);
            await assertExpectedBalance(0, balance.add(mintAmount).div(1e9));
        });
    });
    describe("rebalance cooldown", function () {
        let mockAllocator;
        const setUpRebalanceCooldown = deployments.createFixture(async (hh) => {
            const mockAllocatorFactory = await smock_1.smock.mock("MockAssetAllocator");
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
            (0, chai_1.expect)(farmer.rebalance(token0.address)).to.be.revertedWith(
                "Farmer: cool down active"
            );
        });
        it("Should have 1 rebalance cooldown per token", async function () {
            (0, chai_1.expect)(farmer.rebalance(token1.address)).not.reverted;
        });
        it("Should let rebalance after cool down time passed", async function () {
            await (0, testUtils_1.increaseTime)(hardhat_1.default, 1000);
            (0, chai_1.expect)(farmer.rebalance(token0.address)).not.reverted;
        });
        it("Should let force rebalance bypass cooldown", async function () {
            (0, chai_1.expect)(farmer.forceRebalance(token0.address)).not.reverted;
        });
    });
    describe("Harvest", async function () {
        let mockAllocator;
        const setupMock = deployments.createFixture(async (hh) => {
            const mockAllocatorFactory = await smock_1.smock.mock("MockAssetAllocator");
            mockAllocator = await mockAllocatorFactory.deploy();
            await farmer.setAllocator(mockAllocator.address);
            await farmer.rebalance(token0.address);
        });
        beforeEach(async function () {
            await setupMock();
        });
        it("Should call AssetAllocator collectRewards function", async function () {
            await farmer.harvest(token0.address);
            (0, chai_1.expect)(mockAllocator.collectRewards).to.have.been.calledWith(
                token0.address
            );
        });
    });
    describe("As Strategists", function () {
        let strategistFarmer;
        beforeEach(async () => {
            await roles.addStrategist(otherAccount.address);
            strategistFarmer = typechain_1.Farmer__factory.connect(
                farmer.address,
                otherAccount
            );
        });
        it("Should be able to setLimit", async function () {
            await strategistFarmer.setLimit(
                token0.address,
                50000,
                (0, utils_1.parseEther)("1.1"),
                (0, utils_1.parseEther)("0")
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
        let architectFarmer;
        beforeEach(async () => {
            await roles.addArchitect(otherAccount.address);
            architectFarmer = typechain_1.Farmer__factory.connect(
                farmer.address,
                otherAccount
            );
        });
        it("Should be able to update treasury manager", async function () {
            await architectFarmer.setTreasuryManager(deployer.address);
            (0, chai_1.expect)(await architectFarmer.treasuryManagerAddress()).to.eq(
                deployer.address
            );
        });
        it("Should be able to update treasury depositor", async function () {
            await architectFarmer.setTreasuryDepositor(deployer.address);
            (0, chai_1.expect)(await architectFarmer.treasuryDepositorAddress()).to.eq(
                deployer.address
            );
        });
        it("Should be able to update allocator", async function () {
            await architectFarmer.setAllocator(deployer.address);
            (0, chai_1.expect)(await architectFarmer.allocator()).to.eq(deployer.address);
        });
    });
    describe("As noone", function () {
        const CALLER_NOT_STRATEGIST = "caller is not a strategist";
        const CALLER_NOT_ARCHITECT = "caller is not an architect";
        let externalFarmer;
        beforeEach(async () => {
            externalFarmer = typechain_1.Farmer__factory.connect(
                farmer.address,
                otherAccount
            );
        });
        it("Should not be able to setLimit", async function () {
            (0, chai_1.expect)(
                externalFarmer.setLimit(
                    token0.address,
                    50000,
                    (0, utils_1.parseEther)("1.1"),
                    (0, utils_1.parseEther)("0")
                )
            ).to.be.revertedWith(CALLER_NOT_STRATEGIST);
        });
        it("Should not be able to update cooldown", async function () {
            (0, chai_1.expect)(
                externalFarmer.setMinElapsedTimeRebalance(1000)
            ).to.be.revertedWith(CALLER_NOT_STRATEGIST);
        });
        it("Should not be able to use forceRebalance", async function () {
            (0, chai_1.expect)(
                externalFarmer.forceRebalance(token0.address)
            ).to.be.revertedWith(CALLER_NOT_STRATEGIST);
        });
        it("Should not be able to setTreasuryManager", async function () {
            (0, chai_1.expect)(
                externalFarmer.setTreasuryManager(deployer.address)
            ).to.be.revertedWith(CALLER_NOT_ARCHITECT);
        });
        it("Should not be able to setTreasuryDepositor", async function () {
            (0, chai_1.expect)(
                externalFarmer.setTreasuryDepositor(deployer.address)
            ).to.be.revertedWith(CALLER_NOT_ARCHITECT);
        });
        it("Should not be able to update allocator", async function () {
            (0, chai_1.expect)(
                externalFarmer.setAllocator(deployer.address)
            ).to.be.revertedWith(CALLER_NOT_ARCHITECT);
        });
        it("Should be able to call rebalance", async function () {
            await externalFarmer.rebalance(token0.address);
        });
    });
});
