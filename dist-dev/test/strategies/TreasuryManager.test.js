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
const _39_deployTreasuryManager_1 = require("../../deploy/39_deployTreasuryManager");
const toggleRights_1 = __importStar(require("../../packages/utils/toggleRights"));
require("../chai-setup");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;
describe("AssetManager", function () {
    let deployer;
    let otherAccount;
    let dai;
    let treasury;
    let treasuryManager;
    let arfv;
    let machine;
    // Use a fixture to deploy new contracts to speed up testing time
    const setup = deployments.createFixture(async (hh) => {
        await deployments.fixture([_39_deployTreasuryManager_1.TREASURY_MANAGER_DID]);
        const managerDeployment = await get("TreasuryManager");
        treasuryManager = managerDeployment.contract;
        const machineFactory = await smock_1.smock.mock("TreasuryManagerMockMachine");
        machine = await machineFactory.deploy(treasuryManager.address);
        await treasuryManager.addMachine(machine.address);
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
    it("Should return balance of treasury", async function () {
        const amount = (0, utils_1.parseUnits)("100", "ether");
        await dai.mint(treasury.address, amount);
        (0, chai_1.expect)(await treasuryManager.balance(dai.address)).to.eq(amount);
    });
    it("Should only let machine use manage", async function () {
        (0, chai_1.expect)(treasuryManager.manage(dai.address, 1000)).to.be.revertedWith(
            "caller is not a machine"
        );
    });
    it("Should only let machine use withdraw", async function () {
        (0, chai_1.expect)(
            treasuryManager.withdraw(dai.address, 1000)
        ).to.be.revertedWith("caller is not a machine");
    });
    it("Should not let address call manage", async function () {
        await treasuryManager.addMachine(deployer.address);
        (0, chai_1.expect)(treasuryManager.manage(dai.address, 1000)).to.be.revertedWith(
            "caller is not a contract"
        );
    });
    it("Should not let address call withdraw", async function () {
        await treasuryManager.addMachine(deployer.address);
        (0, chai_1.expect)(
            treasuryManager.withdraw(dai.address, 1000)
        ).to.be.revertedWith("caller is not a contract");
    });
    describe("RFV", async function () {
        const daiBalance = (0, utils_1.parseUnits)("10000", "ether");
        const setupDAIManagingTest = deployments.createFixture(async (xhh) => {
            await dai.mint(deployer.address, daiBalance);
            await dai.approve(treasury.address, daiBalance);
            await (0, toggleRights_1.default)(
                treasury,
                toggleRights_1.MANAGING.RESERVEDEPOSITOR,
                deployer.address
            );
            await treasury.deposit(daiBalance, dai.address, daiBalance.div(1e9));
        });
        beforeEach(async () => {
            await setupDAIManagingTest();
        });
        const testsManage = () => {
            it("Should withdraw 100% to mock and replace with ARFV in treasury", async function () {
                await manageExpectation(daiBalance);
            });
            it("Should withdraw 50% to mock and replace with ARFV in treasury", async function () {
                const amount = daiBalance.div(2);
                await manageExpectation(amount);
            });
        };
        const manageExpectation = async (amount) => {
            const totalReserve = await treasury.totalReserves();
            await machine.manage(dai.address, amount);
            (0, chai_1.expect)(await dai.balanceOf(machine.address)).to.eq(amount);
            (0, chai_1.expect)(await arfv.balanceOf(treasury.address)).to.eq(
                amount.div(1e9)
            );
            (0, chai_1.expect)(await treasury.totalReserves()).to.eq(totalReserve);
        };
        describe("with 100% excess reserve", function () {
            testsManage();
            it("Can withdraw all balance", async function () {
                await machine.withdraw(dai.address, daiBalance);
                (0, chai_1.expect)(await dai.balanceOf(machine.address)).to.eq(
                    daiBalance
                );
                (0, chai_1.expect)(await arfv.balanceOf(treasury.address)).to.eq(0);
                (0, chai_1.expect)(await treasury.totalReserves()).to.eq(0);
            });
        });
        describe("with 50% excess reserve", function () {
            const setup50ExcessReserve = deployments.createFixture(async (hh) => {
                await (0, toggleRights_1.default)(
                    treasury,
                    toggleRights_1.MANAGING.REWARDMANAGER,
                    deployer.address
                );
                await treasury.mintRewards(deployer.address, daiBalance.div(2).div(1e9));
            });
            beforeEach(async function () {
                await setup50ExcessReserve();
            });
            testsManage();
            it("Can withdraw half balance", async function () {
                const amount = daiBalance.div(2);
                await machine.withdraw(dai.address, amount);
                (0, chai_1.expect)(await dai.balanceOf(machine.address)).to.eq(amount);
                (0, chai_1.expect)(await dai.balanceOf(treasury.address)).to.eq(amount);
                (0, chai_1.expect)(await arfv.balanceOf(treasury.address)).to.eq(0);
                (0, chai_1.expect)(await treasury.totalReserves()).to.eq(amount.div(1e9));
            });
        });
        describe("with 0% excess reserve", function () {
            const setup50ExcessReserve = deployments.createFixture(async (hh) => {
                await (0, toggleRights_1.default)(
                    treasury,
                    toggleRights_1.MANAGING.REWARDMANAGER,
                    deployer.address
                );
                await treasury.mintRewards(deployer.address, daiBalance.div(1e9));
            });
            beforeEach(async function () {
                await setup50ExcessReserve();
            });
            testsManage();
            it("Can't withdraw half balance", async function () {
                const amount = daiBalance.div(2);
                (0, chai_1.expect)(
                    machine.withdraw(dai.address, amount)
                ).to.be.revertedWith("Insufficient reserves");
            });
        });
    });
    describe("VAR assets", function () {
        const ravBalance = (0, utils_1.parseUnits)("10", "ether");
        let ercFactory;
        let rav;
        const setupManagingVAR = deployments.createFixture(async (hh) => {
            ercFactory = await smock_1.smock.mock("MockToken");
            rav = await ercFactory.deploy(15);
            await rav.mint(treasury.address, ravBalance);
        });
        beforeEach(async function () {
            await setupManagingVAR();
        });
        it("Should manage RAV and not create ARFV", async function () {
            const totalReserve = await treasury.totalReserves();
            await machine.manage(rav.address, ravBalance);
            (0, chai_1.expect)(await rav.balanceOf(machine.address)).to.eq(ravBalance);
            (0, chai_1.expect)(await treasury.totalReserves()).to.eq(totalReserve);
            (0, chai_1.expect)(await arfv.balanceOf(treasury.address)).to.eq(0);
        });
        it("Should withdraw RAV and not create ARFV", async function () {
            const totalReserve = await treasury.totalReserves();
            await machine.withdraw(rav.address, ravBalance);
            (0, chai_1.expect)(await rav.balanceOf(machine.address)).to.eq(ravBalance);
            (0, chai_1.expect)(await treasury.totalReserves()).to.eq(totalReserve);
            (0, chai_1.expect)(await arfv.balanceOf(treasury.address)).to.eq(0);
        });
    });
});
