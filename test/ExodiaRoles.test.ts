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
    let policy: SignerWithAddress;
    let strategist: SignerWithAddress;
    let architect: SignerWithAddress;
    let accounts: string[];
    const POLICY = 0;
    const STRATEGIST = 1;
    const ARCHITECT = 2;
    const NO_ROLE = 3;

    let roles: ExodiaRoles;

    beforeEach(async function () {
        const { deployer: deployerAddress } = await getNamedAccounts();
        accounts = await getUnnamedAccounts();
        deployer = await xhre.ethers.getSigner(deployerAddress);
        noRole = await xhre.ethers.getSigner(accounts[NO_ROLE]);
        policy = await xhre.ethers.getSigner(accounts[POLICY]);
        strategist = await xhre.ethers.getSigner(accounts[STRATEGIST]);
        architect = await xhre.ethers.getSigner(accounts[ARCHITECT]);
        await deployments.fixture([EXODIA_ROLES_DID]);
        const deployment = await get<ExodiaRoles__factory>("ExodiaRoles");
        roles = deployment.contract;
    });

    describe("Policy role", function () {
        const setUp = deployments.createFixture(async (hh) => {
            await roles.addPolicy(policy.address);
        });

        let rolesFromPolicy: ExodiaRoles;

        beforeEach(async function () {
            rolesFromPolicy = ExodiaRoles__factory.connect(roles.address, policy);
            await setUp();
        });

        it("Should return true if account is machine", async function () {
            expect(await roles.isPolicy(accounts[POLICY])).to.be.true;
        });

        it("Should return false if account is not a machine", async function () {
            expect(await roles.isPolicy(accounts[ARCHITECT])).to.be.false;
        });

        it("Should not let machine add other machine", async function () {
            expect(rolesFromPolicy.addPolicy(noRole.address)).to.be.reverted;
        });

        it("Should not let machine remove other machine", async function () {
            expect(rolesFromPolicy.removePolicy(noRole.address)).to.be.reverted;
        });

        it("Should revoke machine role", async function () {
            await roles.removePolicy(policy.address);
            expect(await roles.isPolicy(policy.address)).to.be.false;
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
            expect(await roles.isStrategist(policy.address)).to.be.false;
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
            expect(await roles.isArchitect(policy.address)).to.be.false;
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
