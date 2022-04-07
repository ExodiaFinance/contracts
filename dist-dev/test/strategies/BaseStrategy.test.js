"use strict";
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
const _38_deployExodiaRoles_1 = require("../../deploy/38_deployExodiaRoles");
require("../chai-setup");
const errors_1 = require("../errors");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;
describe("BaseStrategy", function () {
    let deployer;
    let otherAccount;
    let strat;
    let roles;
    let token;
    // Use a fixture to deploy new contracts to speed up testing time
    const setup = deployments.createFixture(async (hh) => {
        await deployments.fixture([_38_deployExodiaRoles_1.EXODIA_ROLES_DID]);
        const rolesDeploy = await get("ExodiaRoles");
        roles = rolesDeploy.contract;
        await roles.addStrategist(deployer.address);
        const stratFactory = await smock_1.smock.mock("MockBaseStrategy");
        strat = await stratFactory.deploy();
        await strat.initialize(deployer.address, roles.address);
        const tokenFactory = await smock_1.smock.mock("MockToken");
        token = await tokenFactory.deploy(18);
    });
    beforeEach(async function () {
        const { deployer: deployerAddress } = await getNamedAccounts();
        const [address0] = await getUnnamedAccounts();
        deployer = await xhre.ethers.getSigner(deployerAddress);
        otherAccount = await xhre.ethers.getSigner(address0);
        await setup();
    });
    it("Should send token to DAO", async function () {
        const mintAmount = (0, utils_1.parseEther)("1");
        await token.mint(strat.address, mintAmount);
        await strat.extractToDAO(token.address);
        (0, chai_1.expect)(await token.balanceOf(await roles.DAO_ADDRESS())).to.eq(
            mintAmount
        );
    });
    it("Should pause deploy", async function () {
        await strat.pause();
        await (0, chai_1.expect)(strat.deploy(token.address)).to.be.revertedWith(
            errors_1.PAUSABLE_PAUSED
        );
    });
    it("Should unpause deploy", async function () {
        await strat.pause();
        await strat.unPause();
        await (0, chai_1.expect)(strat.deploy(token.address)).to.not.be.reverted;
    });
    describe("permissions", async function () {
        let stratAsOther;
        beforeEach(async () => {
            stratAsOther = strat.connect(otherAccount);
        });
        it("Should only let allocator call withdrawTo", async function () {
            await (0, chai_1.expect)(
                stratAsOther.withdrawTo(token.address, 100, otherAccount.address)
            ).to.be.revertedWith(errors_1.STRATEGY_CALLER_IS_NOT_ALLOCATOR);
        });
        it("Should only let allocator call emergencyWithdrawTo", async function () {
            await (0, chai_1.expect)(
                stratAsOther.emergencyWithdrawTo(token.address, otherAccount.address)
            ).to.be.revertedWith(errors_1.STRATEGY_CALLER_IS_NOT_ALLOCATOR);
        });
        it("Should only let allocator call collectProfits", async function () {
            await (0, chai_1.expect)(
                stratAsOther.collectProfits(token.address, otherAccount.address)
            ).to.be.revertedWith(errors_1.STRATEGY_CALLER_IS_NOT_ALLOCATOR);
        });
        it("Should only let allocator call collectRewards", async function () {
            await (0, chai_1.expect)(
                stratAsOther.collectRewards(token.address, otherAccount.address)
            ).to.be.revertedWith(errors_1.STRATEGY_CALLER_IS_NOT_ALLOCATOR);
        });
        it("Should only let strategist call exit", async function () {
            await (0, chai_1.expect)(stratAsOther.exit(token.address)).to.be.revertedWith(
                errors_1.ROLES_CALLER_IS_NOT_STRATEGIST
            );
        });
        it("Should only let strategist call extractToDao", async function () {
            await (0, chai_1.expect)(
                stratAsOther.extractToDAO(token.address)
            ).to.be.revertedWith(errors_1.ROLES_CALLER_IS_NOT_STRATEGIST);
        });
        it("Should only let strategist pause the strategy", async function () {
            await (0, chai_1.expect)(stratAsOther.pause()).to.be.revertedWith(
                errors_1.ROLES_CALLER_IS_NOT_STRATEGIST
            );
        });
        it("Should only let strategist unpause", async function () {
            await strat.pause();
            await (0, chai_1.expect)(stratAsOther.unPause()).to.be.revertedWith(
                errors_1.ROLES_CALLER_IS_NOT_STRATEGIST
            );
        });
    });
});
