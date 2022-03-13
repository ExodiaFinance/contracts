import { MockContract, MockContractFactory, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { keccak256, parseUnits, toUtf8Bytes } from "ethers/lib/utils";
import hre from "hardhat";

import { EXODIA_ROLES_DID } from "../deploy/38_deployExodiaRoles";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { ExodiaRoles, ExodiaRoles__factory } from "../packages/sdk/typechain";

import "./chai-setup";
const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;

describe("ExodiaRoles", function () {
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

    describe.only("DAO transfer", function () {
        let otherRoles: ExodiaRoles;

        beforeEach(function () {
            otherRoles = ExodiaRoles__factory.connect(roles.address, noRole);
        });

        it("Should not let pull DAO if not next DAO", async function () {
            await expect(roles.pullDAO()).to.be.revertedWith("not next DAO");
        });

        it("Should only let DAO push to next DAO", async function () {
            await expect(otherRoles.pushDAO(noRole.address)).to.be.revertedWith(
                "Not DAO"
            );
        });

        describe("Pull/push", function () {
            beforeEach(async function () {
                await roles.pushDAO(noRole.address);
            });

            it("Should set nextDAO", async function () {
                expect(await roles.nextDao()).to.eq(noRole.address);
            });

            it("Should be able to pull next DAO", async function () {
                await otherRoles.pullDAO();
                expect(await roles.DAO_ADDRESS()).to.eq(noRole.address);
                expect(await roles.isDAO(noRole.address)).to.be.true;
                expect(await roles.isDAO(deployer.address)).to.be.false;
            });
        });
    });

    describe("Custom roles", function () {
        const newRole = keccak256(toUtf8Bytes("NEW_ROLE"));
        let noRoleRoles: ExodiaRoles;

        beforeEach(() => {
            noRoleRoles = ExodiaRoles__factory.connect(roles.address, noRole);
        });

        it("Should let DAO add new roles", async function () {
            await roles.grantRole(newRole, deployer.address);
            expect(await roles.hasRole(newRole, deployer.address)).to.be.true;
            expect(await roles.hasRole(newRole, noRole.address)).to.be.false;
        });

        it("Should not let others add new roles", async function () {
            expect(noRoleRoles.grantRole(newRole, deployer.address)).to.be.reverted;
        });
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

        it("Should return true if account is policy", async function () {
            expect(await roles.isPolicy(accounts[POLICY])).to.be.true;
        });

        it("Should return false if account is not a policy", async function () {
            expect(await roles.isPolicy(accounts[ARCHITECT])).to.be.false;
        });

        it("Should not let policy add other policy", async function () {
            expect(rolesFromPolicy.addPolicy(noRole.address)).to.be.reverted;
        });

        it("Should not let policy remove other policy", async function () {
            expect(rolesFromPolicy.removePolicy(noRole.address)).to.be.reverted;
        });

        it("Should revoke policy role", async function () {
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
