import { MockContract, MockContractFactory, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import exp from "constants";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import hre from "hardhat";

import { ALLOCATION_CALCULATOR_DID } from "../../deploy/37_deployAllocationCalculator";
import { IExtendedHRE } from "../../packages/HardhatRegistryExtension/ExtendedHRE";
import { IExodiaContractsRegistry } from "../../packages/sdk/contracts/exodiaContracts";
import {
    AllocationCalculator,
    AllocationCalculator__factory,
    ExodiaRoles,
    ExodiaRoles__factory,
    StrategyWhitelist,
    StrategyWhitelist__factory,
} from "../../packages/sdk/typechain";
import "../chai-setup";
import { ROLES_CALLER_IS_NOT_ARCHITECT, ROLES_CALLER_IS_NOT_STRATEGIST } from "../errors";
const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;

describe("Allocation Calculator", function () {
    let deployer: SignerWithAddress;
    let notDeployer: SignerWithAddress;
    let allocationCalculator: AllocationCalculator;
    let roles: ExodiaRoles;
    let strat0: string;
    let strat1: string;
    let strat2: string;
    const ratio0 = 20_000;
    const ratio1 = 45_000;
    const ratio2 = 35_000;
    let token: string;
    let wl: StrategyWhitelist;

    const setup = deployments.createFixture(async (hh) => {
        const { deployer: deployerAddress } = await getNamedAccounts();
        const strats = await getUnnamedAccounts();
        strat0 = strats[0];
        strat1 = strats[1];
        strat2 = strats[2];
        token = strats[3];
        deployer = await hh.ethers.getSigner(deployerAddress);
        notDeployer = await hh.ethers.getSigner(strats[4]);
        await deployments.fixture([ALLOCATION_CALCULATOR_DID]);
        const deployment = await get<AllocationCalculator__factory>(
            "AllocationCalculator"
        );
        allocationCalculator = deployment.contract;
        const rolesDeploy = await get<ExodiaRoles__factory>("ExodiaRoles");
        roles = rolesDeploy.contract;
        const trackerDeployment = await get<StrategyWhitelist__factory>(
            "StrategyWhitelist"
        );
        wl = trackerDeployment.contract;
    });

    beforeEach(async function () {
        await setup();
    });

    it("Should revert if strategies are not whitelisted", async function () {
        await roles.addStrategist(deployer.address);
        await expect(
            allocationCalculator.setAllocation(
                token,
                [strat0, strat1, strat2],
                [ratio0, ratio1, ratio2]
            )
        ).to.be.revertedWith("AllocCalc: one or more strategies are not whitelisted");
    });

    describe("allocation with no max", function () {
        beforeEach(async function () {
            await roles.addStrategist(deployer.address);
            await wl.add(strat0);
            await wl.add(strat1);
            await wl.add(strat2);
            await allocationCalculator.setAllocation(
                token,
                [strat0, strat1, strat2],
                [ratio0, ratio1, ratio2]
            );
        });

        it("Should return allocations for token", async function () {
            const { addresses, allocations } =
                await allocationCalculator.getStrategiesAllocations(token);
            expect(addresses).to.have.members([strat0, strat1, strat2]);
            expect(allocations.map((bn) => bn.toNumber())).to.have.members([
                ratio0,
                ratio1,
                ratio2,
            ]);
        });

        it("Should return strategies", async function () {
            expect(await allocationCalculator.getStrategies(token)).to.have.members([
                strat0,
                strat1,
                strat2,
            ]);
        });

        it("Should update allocation", async function () {
            await allocationCalculator.setAllocation(
                token,
                [strat0, strat2],
                [ratio0, ratio2]
            );
            const { addresses, allocations } =
                await allocationCalculator.getStrategiesAllocations(token);
            expect(addresses).to.have.members([strat0, strat2]);
            expect(allocations.map((bn) => bn.toNumber())).to.have.members([
                ratio0,
                ratio2,
            ]);
        });

        it("Should return target allocation", async function () {
            const [allocations, allocated] =
                await allocationCalculator.calculateAllocation(token, 100_000);
            expect(allocated).to.eq(100_000);
            expect(allocations.map((bn) => bn.toNumber())).to.have.members([
                ratio0,
                ratio1,
                ratio2,
            ]);
        });
    });

    it("Should only let policy set allocation", async function () {
        const allocCalc = AllocationCalculator__factory.connect(
            allocationCalculator.address,
            notDeployer
        );
        await expect(allocCalc.setAllocation(token, [strat0], [1000])).to.be.revertedWith(
            ROLES_CALLER_IS_NOT_STRATEGIST
        );
    });

    it("Should only let architect set whitelist", async function () {
        const allocCalc = AllocationCalculator__factory.connect(
            allocationCalculator.address,
            notDeployer
        );
        await expect(allocCalc.setWhitelist(token)).to.be.revertedWith(
            ROLES_CALLER_IS_NOT_ARCHITECT
        );
    });
});
