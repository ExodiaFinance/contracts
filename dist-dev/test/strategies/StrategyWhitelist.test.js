"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = __importDefault(require("hardhat"));
const _48_deployStrategyWhitelist_test_1 = require("../../deploy/48_deployStrategyWhitelist.test");
require("../chai-setup");
const utils_1 = require("../../packages/utils/utils");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;
describe("StrategyWhitelist", function () {
    let deployer;
    let otherAccount;
    let strat0;
    let strat1;
    let wl;
    // Use a fixture to deploy new contracts to speed up testing time
    const setup = deployments.createFixture(async (hh) => {
        strat0 = (await getUnnamedAccounts())[0];
        strat1 = (await getUnnamedAccounts())[1];
        await deployments.fixture([
            _48_deployStrategyWhitelist_test_1.STRATEGY_WHITELIST_DID,
        ]);
        const trackerDeployment = await get("StrategyWhitelist");
        wl = trackerDeployment.contract;
        await wl.addMachine(deployer.address);
    });
    beforeEach(async function () {
        const { deployer: deployerAddress } = await getNamedAccounts();
        const [address0] = await getUnnamedAccounts();
        deployer = await xhre.ethers.getSigner(deployerAddress);
        otherAccount = await xhre.ethers.getSigner(address0);
        await setup();
    });
    it("Should add strategy to whitelist", async function () {
        await wl.add(strat0);
        (0, chai_1.expect)(await wl.isWhitelisted(strat0)).to.be.true;
        (0, chai_1.expect)(await wl.isWhitelisted(strat1)).to.be.false;
    });
    it("Should revert when adding null address", async function () {
        await (0, chai_1.expect)(wl.add(utils_1.ZERO_ADDRESS)).to.be.revertedWith(
            "WL: can't add null address"
        );
    });
    it("Should remove strategy to whitelist", async function () {
        await wl.add(strat0);
        await wl.remove(strat0);
        (0, chai_1.expect)(await wl.isWhitelisted(strat0)).to.be.false;
        (0, chai_1.expect)(await wl.isWhitelisted(strat1)).to.be.false;
    });
    it("Should only let architect add strategy", async function () {
        await (0, chai_1.expect)(wl.connect(otherAccount).add(strat0)).to.be.revertedWith(
            "caller is not an architect"
        );
    });
    it("Should only let architect remove strategy", async function () {
        await (0, chai_1.expect)(
            wl.connect(otherAccount).remove(strat0)
        ).to.be.revertedWith("caller is not an architect");
    });
});
