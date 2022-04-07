"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = __importDefault(require("hardhat"));
const _37_deployAllocationCalculator_1 = require("../../deploy/37_deployAllocationCalculator");
const typechain_1 = require("../../packages/sdk/typechain");
require("../chai-setup");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;
describe("Allocation Calculator", function () {
    let deployer;
    let notDeployer;
    let allocationCalculator;
    let roles;
    let strat0;
    let strat1;
    let strat2;
    const ratio0 = 20000;
    const ratio1 = 45000;
    const ratio2 = 35000;
    let token;
    const setup = deployments.createFixture(async (hh) => {
        const { deployer: deployerAddress } = await getNamedAccounts();
        const strats = await getUnnamedAccounts();
        strat0 = strats[0];
        strat1 = strats[1];
        strat2 = strats[2];
        token = strats[3];
        deployer = await hh.ethers.getSigner(deployerAddress);
        notDeployer = await hh.ethers.getSigner(strats[4]);
        await deployments.fixture([
            _37_deployAllocationCalculator_1.ALLOCATION_CALCULATOR_DID,
        ]);
        const deployment = await get("AllocationCalculator");
        allocationCalculator = deployment.contract;
        const rolesDeploy = await get("ExodiaRoles");
        roles = rolesDeploy.contract;
    });
    beforeEach(async function () {
        await setup();
    });
    describe("allocation with no max", function () {
        beforeEach(async function () {
            await roles.addStrategist(deployer.address);
            await allocationCalculator.setAllocation(
                token,
                [strat0, strat1, strat2],
                [ratio0, ratio1, ratio2]
            );
        });
        it("Should return allocations for token", async function () {
            const { addresses, allocations } =
                await allocationCalculator.getStrategiesAllocations(token);
            (0, chai_1.expect)(addresses).to.have.members([strat0, strat1, strat2]);
            (0, chai_1.expect)(allocations.map((bn) => bn.toNumber())).to.have.members([
                ratio0,
                ratio1,
                ratio2,
            ]);
        });
        it("Should return strategies", async function () {
            (0, chai_1.expect)(
                await allocationCalculator.getStrategies(token)
            ).to.have.members([strat0, strat1, strat2]);
        });
        it("Should update allocation", async function () {
            await allocationCalculator.setAllocation(
                token,
                [strat0, strat2],
                [ratio0, ratio2]
            );
            const { addresses, allocations } =
                await allocationCalculator.getStrategiesAllocations(token);
            (0, chai_1.expect)(addresses).to.have.members([strat0, strat2]);
            (0, chai_1.expect)(allocations.map((bn) => bn.toNumber())).to.have.members([
                ratio0,
                ratio2,
            ]);
        });
        it("Should return target allocation", async function () {
            const [allocations, allocated] =
                await allocationCalculator.calculateAllocation(token, 100000);
            (0, chai_1.expect)(allocated).to.eq(100000);
            (0, chai_1.expect)(allocations.map((bn) => bn.toNumber())).to.have.members([
                ratio0,
                ratio1,
                ratio2,
            ]);
        });
    });
    it("Should revert if not called by policy", async function () {
        const allocCalc = typechain_1.AllocationCalculator__factory.connect(
            allocationCalculator.address,
            notDeployer
        );
        await (0, chai_1.expect)(
            allocCalc.setAllocation(token, [strat0], [1000])
        ).to.be.revertedWith("caller is not a strategist");
    });
});
