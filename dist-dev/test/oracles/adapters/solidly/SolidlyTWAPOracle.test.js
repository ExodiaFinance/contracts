"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const smock_1 = require("@defi-wonderland/smock");
const chai_1 = require("chai");
const utils_1 = require("ethers/lib/utils");
const hardhat_1 = __importDefault(require("hardhat"));
const _38_deployExodiaRoles_1 = require("../../../../deploy/38_deployExodiaRoles");
const sdk_1 = require("../../../../packages/sdk");
const typechain_1 = require("../../../../packages/sdk/typechain");
require("../../../chai-setup");
const testUtils_1 = require("../../../testUtils");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts, getUnnamedAccounts, getNetwork } = xhre;
describe("Start test file", function () {
    let deployer;
    let otherAccount;
    let oracle;
    let pp;
    // Use a fixture to deploy new contracts to speed up testing time
    const setup = deployments.createFixture(async (hh) => {
        await deployments.fixture([_38_deployExodiaRoles_1.EXODIA_ROLES_DID]);
        const deployment = await deployments.deploy("SolidlyTWAPOracle", {
            from: deployer.address,
        });
        oracle = typechain_1.SolidlyTWAPOracle__factory.connect(
            deployment.address,
            deployer
        );
        const ppFactory = await smock_1.smock.mock("PriceProvider");
        const { contract: roles } = await get("ExodiaRoles");
        pp = await ppFactory.deploy();
        await pp.initialize(roles.address);
        const { WFTM } = sdk_1.externalAddressRegistry.forNetwork(await getNetwork());
        await oracle.initialize(WFTM, pp.address, roles.address);
    });
    beforeEach(async function () {
        const { deployer: deployerAddress } = await getNamedAccounts();
        const [address0] = await getUnnamedAccounts();
        deployer = await xhre.ethers.getSigner(deployerAddress);
        otherAccount = await xhre.ethers.getSigner(address0);
        await setup();
    });
    describe("for token paired with FTM", async function () {
        const V_OATH_WFTM_PAIR = "0x6B987e02Ca5eAE26D8B2bCAc724D4e03b3B0c295";
        const OATH = "0x21Ada0D2aC28C3A5Fa3cD2eE30882dA8812279B6";
        beforeEach(async () => {
            await oracle.setPair(OATH, V_OATH_WFTM_PAIR);
        });
        it("Should return the OATH price in FTM", async function () {
            const oathFtm = await oracle.getSafePrice(OATH);
            const { WFTM } = sdk_1.externalAddressRegistry.forNetwork(await getNetwork());
            const ftmUsd = await (0, testUtils_1.getTokenPriceFromCoingecko)(WFTM);
            const oathUsd = await (0, testUtils_1.getTokenPriceFromCoingecko)(OATH);
            (0, chai_1.expect)(oathFtm).to.be.closeTo(
                (0, utils_1.parseEther)(`${oathUsd / ftmUsd}`),
                oathFtm.mul(2).div(100)
            );
        });
    });
    describe("for token not paired with FTM", async function () {
        const V_USDC_SYN = "0xB1b3B96cf35435b2518093acD50E02fe03A0131f";
        const SYN = "0xE55e19Fb4F2D85af758950957714292DAC1e25B2";
        beforeEach(async () => {
            await oracle.setPair(SYN, V_USDC_SYN);
        });
        it("Should return the SYN price in FTM", async function () {
            const ftmUsd = 2;
            pp.getSafePrice.returns((0, utils_1.parseEther)(`${1 / ftmUsd}`)); // price provider returns price of USDC in FTM
            const synFtm = await oracle.getSafePrice(SYN);
            const { USDC } = sdk_1.externalAddressRegistry.forNetwork(await getNetwork());
            (0, chai_1.expect)(pp.getSafePrice).to.have.been.calledWith(USDC);
            const synUsd = await (0, testUtils_1.getTokenPriceFromCoingecko)(SYN);
            (0, chai_1.expect)(synFtm).to.be.closeTo(
                (0, utils_1.parseEther)(`${synUsd / ftmUsd}`),
                synFtm.mul(2).div(100)
            );
        });
    });
});
