import { MockContract, MockContractFactory, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { keccak256, parseUnits, toUtf8Bytes } from "ethers/lib/utils";
import hre from "hardhat";

import { EXODIA_ROLES_DID } from "../deploy/38_deployExodiaRoles";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import {
    ExodiaRoles,
    ExodiaRoles__factory,
    MockExodiaAccessControl,
    MockExodiaAccessControl__factory,
} from "../packages/sdk/typechain";

import "./chai-setup";
const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;

describe("Exodia Access Control", function () {
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
    let accessControlled: MockContract<MockExodiaAccessControl>;

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
        const accessControlledFactory =
            await smock.mock<MockExodiaAccessControl__factory>("MockExodiaAccessControl");
        accessControlled = await accessControlledFactory.deploy();
        await accessControlled.initialize(roles.address);
    });

    describe("Machine role", function () {
        let controlledFromMachine: MockExodiaAccessControl;
        let machine: string;
        beforeEach(async function () {
            controlledFromMachine = MockExodiaAccessControl__factory.connect(
                accessControlled.address,
                noRole
            );
            machine = noRole.address;
            await accessControlled.addMachine(machine);
        });

        it("Should return true if account is machine", async function () {
            expect(await accessControlled.isMachine(machine)).to.be.true;
        });

        it("Should return false if account is not a machine", async function () {
            expect(await accessControlled.isMachine(accounts[ARCHITECT])).to.be.false;
        });

        it("Should only let architect add machine", async function () {
            await expect(controlledFromMachine.addMachine(machine)).to.be.revertedWith(
                "caller is not an architect"
            );
        });

        it("Should only let architect remove machine", async function () {
            await expect(controlledFromMachine.removeMachine(machine)).to.be.revertedWith(
                "caller is not an architect"
            );
        });

        it("Should revoke machine role", async function () {
            await accessControlled.removeMachine(machine);
            expect(await accessControlled.isMachine(machine)).to.be.false;
        });

        it("Should revert if caller is not machine", async function () {
            await expect(accessControlled.forOnlyMachine()).to.be.revertedWith(
                "caller is not a machine"
            );
        });

        it("Should not revert if caller is machine", async function () {
            await controlledFromMachine.forOnlyMachine();
        });
    });

    describe("Policy role", function () {
        it("Should only let policy call fct with onlyPolicy", async function () {
            await expect(accessControlled.forOnlyPolicy()).to.be.revertedWith(
                "caller is not policy"
            );
        });

        it("Should let policy call fct with onlyPolicy", async function () {
            await roles.addPolicy(deployer.address);
            await expect(accessControlled.forOnlyPolicy()).to.not.be.reverted;
        });
    });

    describe("Strategist role", function () {
        it("Should only let strategist call fct with onlyStrategist", async function () {
            await expect(accessControlled.forOnlyStrategist()).to.be.revertedWith(
                "caller is not a strategist"
            );
        });

        it("Should let strategist call fct with onlyStrategist", async function () {
            await roles.addStrategist(deployer.address);
            await expect(accessControlled.forOnlyStrategist()).to.not.be.reverted;
        });
    });

    describe("Architect role", function () {
        it("Should only let architect call fct with onlyArchitect", async function () {
            const noRoleAC = MockExodiaAccessControl__factory.connect(
                accessControlled.address,
                noRole
            );
            await expect(noRoleAC.forOnlyArchitect()).to.be.revertedWith(
                "caller is not an architect"
            );
        });

        it("Should let architect call fct with onlyArchitect", async function () {
            await expect(accessControlled.forOnlyArchitect()).to.not.be.reverted;
        });
    });
});
