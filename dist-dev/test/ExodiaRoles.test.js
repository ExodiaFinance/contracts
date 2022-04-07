"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const utils_1 = require("ethers/lib/utils");
const hardhat_1 = __importDefault(require("hardhat"));
const _38_deployExodiaRoles_1 = require("../deploy/38_deployExodiaRoles");
const typechain_1 = require("../packages/sdk/typechain");
require("./chai-setup");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;
describe("ExodiaRoles", function () {
    let deployer;
    let noRole;
    let policy;
    let strategist;
    let architect;
    let accounts;
    const POLICY = 0;
    const STRATEGIST = 1;
    const ARCHITECT = 2;
    const NO_ROLE = 3;
    let roles;
    beforeEach(async function () {
        const { deployer: deployerAddress } = await getNamedAccounts();
        accounts = await getUnnamedAccounts();
        deployer = await xhre.ethers.getSigner(deployerAddress);
        noRole = await xhre.ethers.getSigner(accounts[NO_ROLE]);
        policy = await xhre.ethers.getSigner(accounts[POLICY]);
        strategist = await xhre.ethers.getSigner(accounts[STRATEGIST]);
        architect = await xhre.ethers.getSigner(accounts[ARCHITECT]);
        await deployments.fixture([_38_deployExodiaRoles_1.EXODIA_ROLES_DID]);
        const deployment = await get("ExodiaRoles");
        roles = deployment.contract;
    });
    describe("DAO transfer", function () {
        let otherRoles;
        beforeEach(function () {
            otherRoles = typechain_1.ExodiaRoles__factory.connect(roles.address, noRole);
        });
        it("Should not let pull DAO if not next DAO", async function () {
            await (0, chai_1.expect)(roles.pullDAO()).to.be.revertedWith("not next DAO");
        });
        it("Should only let DAO push to next DAO", async function () {
            await (0, chai_1.expect)(
                otherRoles.pushDAO(noRole.address)
            ).to.be.revertedWith("Not DAO");
        });
        describe("Pull/push", function () {
            beforeEach(async function () {
                await roles.pushDAO(noRole.address);
            });
            it("Should set nextDAO", async function () {
                (0, chai_1.expect)(await roles.nextDao()).to.eq(noRole.address);
            });
            it("Should be able to pull next DAO", async function () {
                await otherRoles.pullDAO();
                (0, chai_1.expect)(await roles.DAO_ADDRESS()).to.eq(noRole.address);
                (0, chai_1.expect)(await roles.isDAO(noRole.address)).to.be.true;
                (0, chai_1.expect)(await roles.isDAO(deployer.address)).to.be.false;
            });
        });
    });
    describe("Custom roles", function () {
        const newRole = (0, utils_1.keccak256)((0, utils_1.toUtf8Bytes)("NEW_ROLE"));
        let noRoleRoles;
        beforeEach(() => {
            noRoleRoles = typechain_1.ExodiaRoles__factory.connect(roles.address, noRole);
        });
        it("Should let DAO add new roles", async function () {
            await roles.grantRole(newRole, deployer.address);
            (0, chai_1.expect)(await roles.hasRole(newRole, deployer.address)).to.be.true;
            (0, chai_1.expect)(await roles.hasRole(newRole, noRole.address)).to.be.false;
        });
        it("Should not let others add new roles", async function () {
            (0, chai_1.expect)(noRoleRoles.grantRole(newRole, deployer.address)).to.be
                .reverted;
        });
    });
    describe("Policy role", function () {
        const setUp = deployments.createFixture(async (hh) => {
            await roles.addPolicy(policy.address);
        });
        let rolesFromPolicy;
        beforeEach(async function () {
            rolesFromPolicy = typechain_1.ExodiaRoles__factory.connect(
                roles.address,
                policy
            );
            await setUp();
        });
        it("Should return true if account is policy", async function () {
            (0, chai_1.expect)(await roles.isPolicy(accounts[POLICY])).to.be.true;
        });
        it("Should return false if account is not a policy", async function () {
            (0, chai_1.expect)(await roles.isPolicy(accounts[ARCHITECT])).to.be.false;
        });
        it("Should not let policy add other policy", async function () {
            (0, chai_1.expect)(rolesFromPolicy.addPolicy(noRole.address)).to.be.reverted;
        });
        it("Should not let policy remove other policy", async function () {
            (0, chai_1.expect)(rolesFromPolicy.removePolicy(noRole.address)).to.be
                .reverted;
        });
        it("Should revoke policy role", async function () {
            await roles.removePolicy(policy.address);
            (0, chai_1.expect)(await roles.isPolicy(policy.address)).to.be.false;
        });
    });
    describe("Strategist role", function () {
        const setUp = deployments.createFixture(async (hh) => {
            await roles.addStrategist(strategist.address);
        });
        let rolesStrategist;
        beforeEach(async function () {
            rolesStrategist = typechain_1.ExodiaRoles__factory.connect(
                roles.address,
                strategist
            );
            await setUp();
        });
        it("Should return true if account is strategist", async function () {
            (0, chai_1.expect)(await roles.isStrategist(strategist.address)).to.be.true;
        });
        it("Should return false if account is not a strategist", async function () {
            (0, chai_1.expect)(await roles.isStrategist(policy.address)).to.be.false;
        });
        it("Should not let strategist add other strategist", async function () {
            (0, chai_1.expect)(rolesStrategist.addStrategist(noRole.address)).to.be
                .reverted;
        });
        it("Should not let strategist remove other strategist", async function () {
            (0, chai_1.expect)(rolesStrategist.removeStrategist(noRole.address)).to.be
                .reverted;
        });
        it("Should revoke strategist role", async function () {
            await roles.removeStrategist(strategist.address);
            (0, chai_1.expect)(await roles.isStrategist(strategist.address)).to.be.false;
        });
    });
    describe("Architect role", function () {
        const setUp = deployments.createFixture(async (hh) => {
            await roles.addArchitect(architect.address);
        });
        let rolesArchitect;
        beforeEach(async function () {
            rolesArchitect = typechain_1.ExodiaRoles__factory.connect(
                roles.address,
                architect
            );
            await setUp();
        });
        it("Should return true if account is architect", async function () {
            (0, chai_1.expect)(await roles.isArchitect(architect.address)).to.be.true;
        });
        it("Should return false if account is not a architect", async function () {
            (0, chai_1.expect)(await roles.isArchitect(policy.address)).to.be.false;
        });
        it("Should not let architect add other architect", async function () {
            (0, chai_1.expect)(rolesArchitect.addArchitect(noRole.address)).to.be
                .reverted;
        });
        it("Should not let architect remove other architect", async function () {
            (0, chai_1.expect)(rolesArchitect.removeArchitect(noRole.address)).to.be
                .reverted;
        });
        it("Should revoke architect role", async function () {
            await roles.removeArchitect(architect.address);
            (0, chai_1.expect)(await roles.isArchitect(architect.address)).to.be.false;
        });
    });
});
