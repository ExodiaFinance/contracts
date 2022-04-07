"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const ethers_1 = require("ethers");
const hardhat_1 = __importDefault(require("hardhat"));
const contracts_1 = require("../packages/sdk/contracts");
const typechain_1 = require("../packages/sdk/typechain");
require("./chai-setup");
const xhre = hardhat_1.default;
const { deployments, get, deploy, getNamedAccounts, getUnnamedAccounts, getNetwork } =
    xhre;
describe("MasterchefBalanceAdapter", function () {
    let deployer;
    let daoAddress;
    let balanceAdapter;
    let BEETS_MASTERCHEF;
    let THE_MONOLITH_POOL;
    const daoLpBalance = ethers_1.BigNumber.from("16370285709400830752661");
    beforeEach(async function () {
        await deployments.fixture([]);
        const { deployer: deployerAddress, DAO } = await getNamedAccounts();
        daoAddress = "0xC4e0cbe134c48085e8FF72eb31f0Ebca29b152ee";
        deployer = await xhre.ethers.getSigner(deployerAddress);
        const deployment = await deployments.deploy("MasterchefBalanceAdapter", {
            from: deployerAddress,
        });
        const addresses = await contracts_1.externalAddressRegistry.forNetwork(
            await getNetwork()
        );
        BEETS_MASTERCHEF = addresses.BEETS_MASTERCHEF;
        THE_MONOLITH_POOL = addresses.THE_MONOLITH_POOL;
        balanceAdapter = await typechain_1.MasterchefBalanceAdapter__factory.connect(
            deployment.address,
            deployer
        );
        await balanceAdapter.addFarm(THE_MONOLITH_POOL, {
            contractAddress: BEETS_MASTERCHEF,
            pid: 37,
        });
    });
    it("Should have one farm", async function () {
        const farm = await balanceAdapter.farmsForToken(THE_MONOLITH_POOL, 0);
        (0, chai_1.expect)(farm.contractAddress).to.eq(BEETS_MASTERCHEF);
        (0, chai_1.expect)(farm.pid).to.eq(37);
    });
    it("Should have a farm", async function () {
        await balanceAdapter.addFarm(THE_MONOLITH_POOL, {
            contractAddress: BEETS_MASTERCHEF,
            pid: 37,
        });
        const farm = await balanceAdapter.farmsForToken(THE_MONOLITH_POOL, 1);
        (0, chai_1.expect)(farm.contractAddress).to.eq(BEETS_MASTERCHEF);
        (0, chai_1.expect)(farm.pid).to.eq(37);
    });
    it("Should return the DAO LP in strat", async function () {
        (0, chai_1.expect)(
            await balanceAdapter.balance(daoAddress, THE_MONOLITH_POOL)
        ).to.eq(daoLpBalance);
    });
    it("Should add farms position", async function () {
        await balanceAdapter.addFarm(THE_MONOLITH_POOL, {
            contractAddress: BEETS_MASTERCHEF,
            pid: 37,
        });
        (0, chai_1.expect)(
            await balanceAdapter.balance(daoAddress, THE_MONOLITH_POOL)
        ).to.eq(daoLpBalance.mul(2));
    });
});
