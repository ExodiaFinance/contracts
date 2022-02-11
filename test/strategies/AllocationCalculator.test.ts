import { MockContract, MockContractFactory, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import exp from "constants";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import hre from "hardhat";

import { IExodiaContractsRegistry } from "../../src/contracts/exodiaContracts";
import { IExtendedHRE } from "../../src/HardhatRegistryExtension/ExtendedHRE";
import "../chai-setup";
import {
    AllocationCalculator,
    AllocationCalculator__factory,
    AssetAllocator__factory,
    MockToken__factory,
} from "../../typechain";
const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;

describe("Allocation Calculator", function () {
    let deployer: SignerWithAddress;
    let notDeployer: SignerWithAddress;
    let allocationCalculator: AllocationCalculator;
    let strat0: string;
    let strat1: string;
    let strat2: string;
    const ratio0 = 20_000;
    const ratio1 = 45_000;
    const ratio2 = 35_000;
    let token: string;

    const setup = deployments.createFixture(async (hh) => {
        const { deployer: deployerAddress } = await getNamedAccounts();
        const strats = await getUnnamedAccounts();
        strat0 = strats[0];
        strat1 = strats[1];
        strat2 = strats[2];
        token = strats[3];
        deployer = await hh.ethers.getSigner(deployerAddress);
        notDeployer = await hh.ethers.getSigner(strats[4]);
        const deployment = await deployments.deploy("AllocationCalculator", {
            from: deployer.address,
        });
        allocationCalculator = AllocationCalculator__factory.connect(
            deployment.address,
            deployer
        );
    });

    beforeEach(async function () {
        await setup();
    });

    describe("allocation with no max", function () {
        beforeEach(async function () {
            await allocationCalculator.setAllocation(
                token,
                [strat0, strat1, strat2],
                [ratio0, ratio1, ratio2]
            );
        });

        it("Should return allocations for token", async function () {
            const { addresses, allocations, maxAllocations } =
                await allocationCalculator.getStrategiesAllocations(token);
            expect(addresses).to.have.members([strat0, strat1, strat2]);
            expect(allocations.map((bn) => bn.toNumber())).to.have.members([
                ratio0,
                ratio1,
                ratio2,
            ]);
            expect(maxAllocations.map((bn) => bn.toNumber())).to.have.members([0, 0, 0]);
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

    describe("allocation with max", function () {
        const max0 = 0;
        const max1 = 200;
        const max2 = 1000000000;

        beforeEach(async function () {
            await allocationCalculator.setAllocationWithMax(
                token,
                [strat0, strat1, strat2],
                [ratio0, ratio1, ratio2],
                [max0, max1, max2]
            );
        });

        it("Should return allocations for token", async function () {
            const { addresses, allocations, maxAllocations } =
                await allocationCalculator.getStrategiesAllocations(token);
            expect(addresses).to.have.members([strat0, strat1, strat2]);
            expect(allocations.map((bn) => bn.toNumber())).to.have.members([
                ratio0,
                ratio1,
                ratio2,
            ]);
            expect(maxAllocations.map((bn) => bn.toNumber())).to.have.members([
                max0,
                max1,
                max2,
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
            await allocationCalculator.setAllocationWithMax(
                token,
                [strat0, strat2],
                [ratio0, ratio2],
                [300, 3000]
            );
            const { addresses, allocations, maxAllocations } =
                await allocationCalculator.getStrategiesAllocations(token);
            expect(addresses).to.have.members([strat0, strat2]);
            expect(allocations.map((bn) => bn.toNumber())).to.have.members([
                ratio0,
                ratio2,
            ]);
            expect(maxAllocations.map((bn) => bn.toNumber())).to.have.members([
                300, 3000,
            ]);
        });

        it("Should return target allocation", async function () {
            const manageable = 100_000_000;
            const [allocations, allocated] =
                await allocationCalculator.calculateAllocation(token, manageable);
            const alloc0 = (ratio0 / 100_000) * manageable;
            const alloc1 = max1;
            const alloc2 = (ratio2 / 100_000) * manageable;
            expect(allocated).to.eq(alloc0 + alloc1 + alloc2);
            expect(allocations.map((bn) => bn.toNumber())).to.have.members([
                alloc0,
                alloc1,
                alloc2,
            ]);
        });
    });

    it("Should revert if not called by policy", async function () {
        const allocCalc = AllocationCalculator__factory.connect(
            allocationCalculator.address,
            notDeployer
        );
        expect(allocCalc.setAllocation(token, [strat0], [1000])).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
    });
});
