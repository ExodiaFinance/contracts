"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const ethers_1 = require("ethers");
const utils_1 = require("ethers/lib/utils");
const hardhat_1 = __importDefault(require("hardhat"));
const _46_deployPnlTracker_1 = require("../../deploy/46_deployPnlTracker");
require("../chai-setup");
const utils_2 = require("../../packages/utils/utils");
const testUtils_1 = require("../testUtils");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;
describe("PNL tracker", function () {
    let deployer;
    let otherAccount;
    let pnlTracker;
    // Use a fixture to deploy new contracts to speed up testing time
    const setup = deployments.createFixture(async (hh) => {
        await deployments.fixture([_46_deployPnlTracker_1.PNLTRACKER_DID]);
        const trackerDeployment = await get("PNLTracker");
        pnlTracker = trackerDeployment.contract;
        await pnlTracker.addMachine(deployer.address);
    });
    beforeEach(async function () {
        const { deployer: deployerAddress } = await getNamedAccounts();
        const [address0] = await getUnnamedAccounts();
        deployer = await xhre.ethers.getSigner(deployerAddress);
        otherAccount = await xhre.ethers.getSigner(address0);
        await setup();
    });
    it("Should set the FIRST_WEEK", async function () {
        (0, chai_1.expect)(await pnlTracker.FIRST_WEEK()).to.eq(
            await pnlTracker.getCurrentWeek()
        );
    });
    it("Should return current week", async function () {
        (0, chai_1.expect)(await pnlTracker.getCurrentWeek()).to.eq(
            ethers_1.BigNumber.from(Date.now()).div(86400 * 7 * 1000)
        );
    });
    it("Should only let machine call track", async function () {
        await (0, chai_1.expect)(
            pnlTracker
                .connect(otherAccount)
                .track(utils_2.ZERO_ADDRESS, (0, utils_1.parseEther)("1"))
        ).to.be.revertedWith("caller is not a machine");
    });
    it("Should track profits", async function () {
        const pnl0 = (0, utils_1.parseEther)("1");
        await pnlTracker.track(utils_2.ZERO_ADDRESS, pnl0);
        const week = await pnlTracker.getCurrentWeek();
        (0, chai_1.expect)(await pnlTracker.weeksPnl(week, utils_2.ZERO_ADDRESS)).to.eq(
            pnl0
        );
        const pnl1 = (0, utils_1.parseEther)("2");
        await pnlTracker.track(utils_2.ZERO_ADDRESS, pnl1);
        (0, chai_1.expect)(await pnlTracker.weeksPnl(week, utils_2.ZERO_ADDRESS)).to.eq(
            pnl0.add(pnl1)
        );
        const pnl2 = (0, utils_1.parseEther)("-7");
        await pnlTracker.track(utils_2.ZERO_ADDRESS, pnl2);
        (0, chai_1.expect)(await pnlTracker.weeksPnl(week, utils_2.ZERO_ADDRESS)).to.eq(
            pnl0.add(pnl1).add(pnl2)
        );
    });
    it("Should reset every week", async function () {
        const pnl0 = (0, utils_1.parseEther)("1");
        await pnlTracker.track(utils_2.ZERO_ADDRESS, pnl0);
        await (0, testUtils_1.increaseTime)(xhre, 86400 * 7);
        const week = await pnlTracker.getCurrentWeek();
        (0, chai_1.expect)(await pnlTracker.weeksPnl(week, utils_2.ZERO_ADDRESS)).to.eq(
            0
        );
    });
});
