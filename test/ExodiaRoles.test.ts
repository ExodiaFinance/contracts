import { MockContract, MockContractFactory, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import hre from "hardhat";

import { EXODIA_ROLES_DID } from "../deploy/38_deployExodiaRoles";
import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import { ExodiaRoles, ExodiaRoles__factory } from "../typechain";

import "./chai-setup";
const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;

describe("Allocation Calculator", function () {
    let deployer: SignerWithAddress;
    let noRole: SignerWithAddress;
    let machine: SignerWithAddress;
    let strategist: SignerWithAddress;
    let architect: SignerWithAddress;
    let accounts: string[];
    const MACHINE = 0;
    const STRATEGIST = 1;
    const ARCHITECT = 2;
    const NO_ROLE = 3;

    let roles: ExodiaRoles;

    beforeEach(async function () {
        const { deployer: deployerAddress } = await getNamedAccounts();
        accounts = await getUnnamedAccounts();
        deployer = await xhre.ethers.getSigner(deployerAddress);
        noRole = await xhre.ethers.getSigner(accounts[NO_ROLE]);
        machine = await xhre.ethers.getSigner(accounts[MACHINE]);
        strategist = await xhre.ethers.getSigner(accounts[STRATEGIST]);
        architect = await xhre.ethers.getSigner(accounts[ARCHITECT]);
        await deployments.fixture([EXODIA_ROLES_DID]);
        const deployment = await get<ExodiaRoles__factory>("ExodiaRoles");
        roles = deployment.contract;
    });

    describe("Machine role", function () {
        const setUp = deployments.createFixture(async (hh) => {
            await roles.addMachine(machine.address);
        });

        let rolesMachine: ExodiaRoles;

        beforeEach(async function () {
            rolesMachine = ExodiaRoles__factory.connect(roles.address, machine);
            await setUp();
        });

        it("Should return true if account is machine", async function () {
            expect(await roles.isMachine(accounts[MACHINE])).to.be.true;
        });

        it("Should return false if account is not a machine", async function () {
            expect(await roles.isMachine(accounts[ARCHITECT])).to.be.false;
        });

        it("Should not let machine add other machine", async function () {
            expect(rolesMachine.addMachine(noRole.address)).to.be.reverted;
        });

        it("Should not let machine remove other machine", async function () {
            expect(rolesMachine.removeMachine(noRole.address)).to.be.reverted;
        });

        it("Should revoke machine role", async function () {
            await roles.removeMachine(machine.address);
            expect(await roles.isMachine(machine.address)).to.be.false;
        });
    });

    describe("Strategist role", function () {
        const setUp = deployments.createFixture(async (hh) => {
            await roles.addStrategist(strategist.address);
        });

        let rolesStrategist: ExodiaRoles;

        beforeEach(async function () {
            rolesStrategist = ExodiaRoles__factory.connect(roles.address, strategist);
            await setUp();
        });

        it("Should return true if account is strategist", async function () {
            expect(await roles.isStrategist(strategist.address)).to.be.true;
        });

        it("Should return false if account is not a strategist", async function () {
            expect(await roles.isStrategist(machine.address)).to.be.false;
        });

        it("Should not let strategist add other strategist", async function () {
            expect(rolesStrategist.addStrategist(noRole.address)).to.be.reverted;
        });

        it("Should not let strategist remove other strategist", async function () {
            expect(rolesStrategist.removeStrategist(noRole.address)).to.be.reverted;
        });

        it("Should revoke strategist role", async function () {
            await roles.removeStrategist(strategist.address);
            expect(await roles.isStrategist(strategist.address)).to.be.false;
        });
    });

    describe("Architect role", function () {
        const setUp = deployments.createFixture(async (hh) => {
            await roles.addArchitect(architect.address);
        });

        let rolesArchitect: ExodiaRoles;

        beforeEach(async function () {
            rolesArchitect = ExodiaRoles__factory.connect(roles.address, architect);
            await setUp();
        });

        it("Should return true if account is architect", async function () {
            expect(await roles.isArchitect(architect.address)).to.be.true;
        });

        it("Should return false if account is not a architect", async function () {
            expect(await roles.isArchitect(machine.address)).to.be.false;
        });

        it("Should not let architect add other architect", async function () {
            expect(rolesArchitect.addArchitect(noRole.address)).to.be.reverted;
        });

        it("Should not let architect remove other architect", async function () {
            expect(rolesArchitect.removeArchitect(noRole.address)).to.be.reverted;
        });

        it("Should revoke architect role", async function () {
            await roles.removeArchitect(architect.address);
            expect(await roles.isArchitect(architect.address)).to.be.false;
        });
    });
});
