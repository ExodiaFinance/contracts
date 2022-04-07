"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const smock_1 = require("@defi-wonderland/smock");
const chai_1 = require("chai");
const hardhat_1 = __importDefault(require("hardhat"));
const _38_deployExodiaRoles_1 = require("../deploy/38_deployExodiaRoles");
const typechain_1 = require("../packages/sdk/typechain");
require("./chai-setup");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;
describe("Exodia Access Control", function () {
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
    let accessControlled;
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
        const accessControlledFactory = await smock_1.smock.mock(
            "MockExodiaAccessControl"
        );
        accessControlled = await accessControlledFactory.deploy();
        await accessControlled.initialize(roles.address);
    });
    describe("Machine role", function () {
        let controlledFromMachine;
        let machine;
        beforeEach(async function () {
            controlledFromMachine = typechain_1.MockExodiaAccessControl__factory.connect(
                accessControlled.address,
                noRole
            );
            machine = noRole.address;
            await accessControlled.addMachine(machine);
        });
        it("Should return true if account is machine", async function () {
            (0, chai_1.expect)(await accessControlled.isMachine(machine)).to.be.true;
        });
        it("Should return false if account is not a machine", async function () {
            (0, chai_1.expect)(await accessControlled.isMachine(accounts[ARCHITECT])).to
                .be.false;
        });
        it("Should only let architect add machine", async function () {
            await (0, chai_1.expect)(
                controlledFromMachine.addMachine(machine)
            ).to.be.revertedWith("caller is not an architect");
        });
        it("Should only let architect remove machine", async function () {
            await (0, chai_1.expect)(
                controlledFromMachine.removeMachine(machine)
            ).to.be.revertedWith("caller is not an architect");
        });
        it("Should revoke machine role", async function () {
            await accessControlled.removeMachine(machine);
            (0, chai_1.expect)(await accessControlled.isMachine(machine)).to.be.false;
        });
        it("Should revert if caller is not machine", async function () {
            await (0, chai_1.expect)(
                accessControlled.forOnlyMachine()
            ).to.be.revertedWith("caller is not a machine");
        });
        it("Should not revert if caller is machine", async function () {
            await controlledFromMachine.forOnlyMachine();
        });
    });
    describe("Policy role", function () {
        it("Should only let policy call fct with onlyPolicy", async function () {
            await (0, chai_1.expect)(accessControlled.forOnlyPolicy()).to.be.revertedWith(
                "caller is not policy"
            );
        });
        it("Should let policy call fct with onlyPolicy", async function () {
            await roles.addPolicy(deployer.address);
            await (0, chai_1.expect)(accessControlled.forOnlyPolicy()).to.not.be.reverted;
        });
    });
    describe("Strategist role", function () {
        it("Should only let strategist call fct with onlyStrategist", async function () {
            await (0, chai_1.expect)(
                accessControlled.forOnlyStrategist()
            ).to.be.revertedWith("caller is not a strategist");
        });
        it("Should let strategist call fct with onlyStrategist", async function () {
            await roles.addStrategist(deployer.address);
            await (0, chai_1.expect)(accessControlled.forOnlyStrategist()).to.not.be
                .reverted;
        });
    });
    describe("Architect role", function () {
        it("Should only let architect call fct with onlyArchitect", async function () {
            const noRoleAC = typechain_1.MockExodiaAccessControl__factory.connect(
                accessControlled.address,
                noRole
            );
            await (0, chai_1.expect)(noRoleAC.forOnlyArchitect()).to.be.revertedWith(
                "caller is not an architect"
            );
        });
        it("Should let architect call fct with onlyArchitect", async function () {
            await (0, chai_1.expect)(accessControlled.forOnlyArchitect()).to.not.be
                .reverted;
        });
    });
});
