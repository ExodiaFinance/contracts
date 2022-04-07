"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = __importDefault(require("hardhat"));
const _29_deployFBEETSOracle_1 = require("../../deploy/29_deployFBEETSOracle");
const contracts_1 = require("../../packages/sdk/contracts");
const typechain_1 = require("../../packages/sdk/typechain");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts, deploy, getNetwork } = xhre;
describe("GOHMSpotPriceOracle", function () {
    let oracle;
    let deployer;
    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
        await deployments.fixture([_29_deployFBEETSOracle_1.FBEETS_ORACLE_DID]);
        const oracleDeployment = await get("fBEETSPriceOracle");
        oracle = oracleDeployment.contract;
    });
    it("should return fbeets price", async function () {
        const { FTM_USD_FEED, FIDELIO_DUETTO, FBEETS_BAR } =
            contracts_1.externalAddressRegistry.forNetwork(await getNetwork());
        const { answer: fBeetsUsd } = await oracle.latestRoundData();
        const signer = await xhre.ethers.getSigner(deployer);
        const balOracle = typechain_1.IBalV2PriceOracle__factory.connect(
            FIDELIO_DUETTO,
            signer
        );
        const balOracleAnswer = await balOracle.getTimeWeightedAverage([
            { variable: 1, secs: 120, ago: 0 },
        ]);
        const bptFtm = balOracleAnswer[0];
        const fBeetsSupply = await typechain_1.IERC20__factory.connect(
            FBEETS_BAR,
            signer
        ).totalSupply();
        const lockedBpt = await typechain_1.IERC20__factory.connect(
            FIDELIO_DUETTO,
            signer
        ).balanceOf(FBEETS_BAR);
        const expectedFBeetsUsd = bptFtm.mul(lockedBpt).div(fBeetsSupply);
        (0, chai_1.expect)(fBeetsUsd).to.be.gt(bptFtm);
        (0, chai_1.expect)(fBeetsUsd).to.closeTo(expectedFBeetsUsd, 1e3);
    });
});
