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
const utils_1 = require("ethers/lib/utils");
const hardhat_1 = __importDefault(require("hardhat"));
const _40_deployTreasuryDepositor_1 = require("../../deploy/40_deployTreasuryDepositor");
const toggleRights_1 = __importStar(require("../../packages/utils/toggleRights"));
require("../chai-setup");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;
describe("TreasuryDepositor", function () {
    let deployer;
    let otherAccount;
    let dai;
    let treasury;
    let depositor;
    let arfv;
    let machine;
    const setup = deployments.createFixture(async (hh) => {
        await deployments.fixture([_40_deployTreasuryDepositor_1.TREASURY_DEPOSITOR_DID]);
        const depositorDeployment = await get("TreasuryDepositor");
        depositor = depositorDeployment.contract;
        const machineFactory = await smock_1.smock.mock("TreasuryDepositorMockMachine");
        machine = await machineFactory.deploy(depositor.address);
        await depositor.addMachine(machine.address);
    });
    beforeEach(async function () {
        const { deployer: deployerAddress } = await getNamedAccounts();
        const [address0] = await getUnnamedAccounts();
        deployer = await xhre.ethers.getSigner(deployerAddress);
        otherAccount = await xhre.ethers.getSigner(address0);
        await setup();
        const daiDeployment = await get("DAI");
        dai = daiDeployment.contract;
        const treasuryDeployment = await get("OlympusTreasury");
        treasury = treasuryDeployment.contract;
        const arfvDeployment = await get("AllocatedRiskFreeValue");
        arfv = arfvDeployment.contract;
    });
    describe("RFV", function () {
        const daiBalance = (0, utils_1.parseUnits)("10000", "ether");
        const mintDAI = deployments.createFixture(async (xhh) => {
            await dai.mint(deployer.address, daiBalance);
            await dai.approve(machine.address, daiBalance);
        });
        beforeEach(async () => {
            await mintDAI();
        });
        describe("deposit()", function () {
            const deposit = deployments.createFixture(async (hh) => {
                await machine.deposit(dai.address, daiBalance);
            });
            beforeEach(async function () {
                await deposit();
            });
            it("Should have deposited DAI in Treasury", async function () {
                (0, chai_1.expect)(await dai.balanceOf(treasury.address)).to.eq(
                    daiBalance
                );
            });
            it("Should have increased totalReserves", async function () {
                (0, chai_1.expect)(await treasury.totalReserves()).to.eq(
                    daiBalance.div(1e9)
                );
            });
        });
        describe("returnFunds", function () {
            const arfvBalance = daiBalance.div(1e9);
            const daiBorrowed = arfvBalance.mul(1e9);
            const depositArfv = deployments.createFixture(async (hh) => {
                await arfv.mint(arfvBalance);
                await (0, toggleRights_1.default)(
                    treasury,
                    toggleRights_1.MANAGING.RESERVEDEPOSITOR,
                    deployer.address
                );
                await arfv.approve(treasury.address, arfvBalance);
                await treasury.deposit(arfvBalance, arfv.address, arfvBalance);
            });
            beforeEach(async function () {
                await depositArfv();
            });
            it("Should not fail if losses brings excess reserves under 0", async function () {
                await (0, toggleRights_1.default)(
                    treasury,
                    toggleRights_1.MANAGING.REWARDMANAGER,
                    deployer.address
                );
                const mintedAmount = 100e9;
                await treasury.mintRewards(deployer.address, mintedAmount);
                await machine.returnWithLoss(dai.address, daiBalance, daiBalance);
                (0, chai_1.expect)(await treasury.totalReserves()).to.eq(mintedAmount);
                (0, chai_1.expect)(await treasury.excessReserves()).to.eq(0);
            });
            it("Should withdraw arfv and deposit dai", async function () {
                await machine.returnFunds(dai.address, daiBalance);
                (0, chai_1.expect)(await dai.balanceOf(treasury.address)).to.eq(
                    daiBalance
                );
                (0, chai_1.expect)(await arfv.balanceOf(treasury.address)).to.eq(
                    arfvBalance.sub(daiBalance.div(1e9))
                );
            });
            it("Should fail to return more RFV than there is ARFV", async function () {
                const newMint = (0, utils_1.parseUnits)("1000000000000", "ether");
                const newBalance = daiBalance.add(newMint);
                await dai.mint(deployer.address, newMint);
                await dai.approve(machine.address, newBalance);
                await (0, chai_1.expect)(
                    machine.returnFunds(dai.address, newBalance)
                ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
            });
            it("Should register profit", async function () {
                const profits = (0, utils_1.parseUnits)("1000000000000", "ether");
                const newBalance = daiBalance.add(profits);
                await dai.mint(deployer.address, profits);
                await dai.approve(machine.address, newBalance);
                await machine.returnWithProfits(
                    dai.address,
                    daiBorrowed,
                    newBalance.sub(daiBorrowed)
                );
                (0, chai_1.expect)(await dai.balanceOf(treasury.address)).to.eq(
                    newBalance
                );
                (0, chai_1.expect)(await treasury.totalReserves()).to.eq(
                    newBalance.div(1e9)
                );
                (0, chai_1.expect)(await arfv.balanceOf(treasury.address)).to.eq(0);
            });
            it("Should register loss", async function () {
                const loss = (0, utils_1.parseUnits)("10", "ether");
                const newBalance = daiBalance.sub(loss);
                await machine.returnWithLoss(dai.address, daiBorrowed, loss);
                (0, chai_1.expect)(await dai.balanceOf(treasury.address)).to.eq(
                    newBalance
                );
                (0, chai_1.expect)(await treasury.totalReserves()).to.eq(
                    newBalance.div(1e9)
                );
                (0, chai_1.expect)(await arfv.balanceOf(treasury.address)).to.eq(0);
            });
        });
    });
    describe("VAR assets", function () {
        const varBalance = (0, utils_1.parseUnits)("100", "ether");
        let ercFactory;
        let varToken;
        const setupVAR = deployments.createFixture(async (hh) => {
            ercFactory = await smock_1.smock.mock("MockToken");
            varToken = await ercFactory.deploy(15);
            await varToken.mint(deployer.address, varBalance);
            await varToken.approve(machine.address, varBalance);
        });
        beforeEach(async function () {
            await setupVAR();
        });
        it("Should deposit funds and not touch reserves", async function () {
            await machine.deposit(varToken.address, varBalance);
            (0, chai_1.expect)(await treasury.totalReserves()).to.eq(0);
        });
        describe("Return VAR", function () {
            const arfvBalance = (0, utils_1.parseUnits)("100", "ether");
            const varProfits = varBalance.div(2);
            const varBorrowed = varBalance.div(2);
            const depositArfv = deployments.createFixture(async (hh) => {
                await arfv.mint(arfvBalance);
                await (0, toggleRights_1.default)(
                    treasury,
                    toggleRights_1.MANAGING.RESERVEDEPOSITOR,
                    deployer.address
                );
                await arfv.approve(treasury.address, arfvBalance);
                await treasury.deposit(arfvBalance, arfv.address, arfvBalance);
            });
            beforeEach(async function () {
                await depositArfv();
            });
            it("Should returnFunds and not increase reserves or remove ARFV", async function () {
                await machine.returnFunds(varToken.address, varBalance);
                (0, chai_1.expect)(await arfv.balanceOf(treasury.address)).to.eq(
                    arfvBalance
                );
                (0, chai_1.expect)(await varToken.balanceOf(treasury.address)).to.eq(
                    varBalance
                );
                (0, chai_1.expect)(await treasury.totalReserves()).to.eq(arfvBalance);
            });
            it("Should returnWithProfits and not increase reserves or remove ARFV", async function () {
                await machine.returnWithProfits(
                    varToken.address,
                    varBorrowed,
                    varProfits
                );
                (0, chai_1.expect)(await arfv.balanceOf(treasury.address)).to.eq(
                    arfvBalance
                );
                (0, chai_1.expect)(await varToken.balanceOf(treasury.address)).to.eq(
                    varBalance
                );
                (0, chai_1.expect)(await treasury.totalReserves()).to.eq(arfvBalance);
            });
            it("Should returnWithLoss and not decrease reserves or remove ARFV", async function () {
                const varLoss = varProfits;
                await machine.returnWithLoss(varToken.address, varBalance, varLoss);
                (0, chai_1.expect)(await arfv.balanceOf(treasury.address)).to.eq(
                    arfvBalance
                );
                (0, chai_1.expect)(await varToken.balanceOf(treasury.address)).to.eq(
                    varBalance.sub(varLoss)
                );
                (0, chai_1.expect)(await treasury.totalReserves()).to.eq(arfvBalance);
            });
        });
    });
    describe("RemoveARFVFromTreasury", function () {
        const arfvBalance = (0, utils_1.parseUnits)("100", "ether");
        const varBalance = (0, utils_1.parseUnits)("100", "ether");
        let ercFactory;
        let varToken;
        const setupArfvTest = deployments.createFixture(async (hh) => {
            await arfv.mint(arfvBalance);
            await (0, toggleRights_1.default)(
                treasury,
                toggleRights_1.MANAGING.RESERVEDEPOSITOR,
                deployer.address
            );
            await arfv.approve(treasury.address, arfvBalance);
            await treasury.deposit(arfvBalance, arfv.address, arfvBalance);
            ercFactory = await smock_1.smock.mock("MockToken");
            varToken = await ercFactory.deploy(15);
            await varToken.mint(deployer.address, varBalance);
            await varToken.approve(machine.address, varBalance);
        });
        beforeEach(async function () {
            await setupArfvTest();
        });
        it("Should remove all ARFV", async function () {
            await machine.registerLoss(dai.address, arfvBalance.mul(1e9));
            (0, chai_1.expect)(await arfv.balanceOf(treasury.address)).to.eq(0);
            (0, chai_1.expect)(await treasury.totalReserves()).to.eq(0);
        });
        it("Should not remove ARFV", async function () {
            await machine.registerLoss(varToken.address, varBalance);
            (0, chai_1.expect)(await arfv.balanceOf(treasury.address)).to.eq(arfvBalance);
            (0, chai_1.expect)(await treasury.totalReserves()).to.eq(arfvBalance);
        });
    });
    describe("mint ARFV in treasury", function () {
        it("Should mint valueOf DAI in treasury", async function () {
            const amount = (0, utils_1.parseUnits)("1000", "ether");
            await machine.registerProfit(dai.address, amount);
            (0, chai_1.expect)(await arfv.balanceOf(treasury.address)).to.eq(
                amount.div(1e9)
            );
        });
        it("Should not mint arfv if token is not RFV", async function () {
            const amount = (0, utils_1.parseUnits)("1000", "ether");
            await machine.registerProfit(deployer.address, amount);
            (0, chai_1.expect)(await arfv.balanceOf(treasury.address)).to.eq(0);
        });
    });
    describe("Permissions", function () {
        const testPermissions = (error, caller) => {
            it(`Should only let ${caller} use returnFunds`, async function () {
                await (0, chai_1.expect)(
                    depositor.returnFunds(dai.address, 1000)
                ).to.be.revertedWith(error);
            });
            it(`Should only let ${caller} use returnWithProfits`, async function () {
                await (0, chai_1.expect)(
                    depositor.returnWithProfits(dai.address, 1000, 10)
                ).to.be.revertedWith(error);
            });
            it(`Should only let ${caller} use returnWithLoss`, async function () {
                await (0, chai_1.expect)(
                    depositor.returnWithLoss(dai.address, 1000, 10)
                ).to.be.revertedWith(error);
            });
            it(`Should only let ${caller} use deposit`, async function () {
                await (0, chai_1.expect)(
                    depositor.deposit(dai.address, 1000)
                ).to.be.revertedWith(error);
            });
            it(`Should only let ${caller} register loss`, async function () {
                await (0, chai_1.expect)(
                    depositor.registerLoss(dai.address, 1000)
                ).to.be.revertedWith(error);
            });
            it(`Should only let ${caller} register profit`, async function () {
                await (0, chai_1.expect)(
                    depositor.registerProfit(dai.address, 1000)
                ).to.be.revertedWith(error);
            });
        };
        testPermissions("caller is not a machine", "machine");
        describe("as machine", function () {
            const addMachine = deployments.createFixture(async (hh) => {
                await depositor.addMachine(deployer.address);
            });
            beforeEach(async function () {
                await addMachine();
            });
            testPermissions("caller is not a contract", "contract");
        });
    });
});
