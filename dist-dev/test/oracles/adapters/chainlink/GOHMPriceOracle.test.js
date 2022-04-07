"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAI_ADDRESS = void 0;
const axios_1 = __importDefault(require("axios"));
const chai_1 = require("chai");
const utils_1 = require("ethers/lib/utils");
const hardhat_1 = __importDefault(require("hardhat"));
const _21_deployGOHMPriceOracle_1 = require("../../../../deploy/21_deployGOHMPriceOracle");
const contracts_1 = require("../../../../packages/sdk/contracts");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts, deploy, getNetwork } = xhre;
exports.DAI_ADDRESS = "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e";
describe("GOHMSpotPriceOracle", function () {
    let oracle;
    let deployer;
    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
        await deployments.fixture([_21_deployGOHMPriceOracle_1.GOHM_ORACLE_DID]);
        const oracleDeployment = await get("GOHMPriceOracle");
        oracle = oracleDeployment.contract;
    });
    it("should return gOHM priced in FTM", async function () {
        const { GOHM, WFTM } = contracts_1.externalAddressRegistry.forNetwork(
            await getNetwork()
        );
        const signer = await xhre.ethers.getSigner(deployer);
        const gOHMUsdc = await getTokenPriceFromCoingecko(GOHM);
        const ftmUsdc = await getTokenPriceFromCoingecko(WFTM);
        const gohmFtm = await oracle.getCurrentPrice(GOHM);
        console.log(gohmFtm.toString());
        (0, chai_1.expect)(gohmFtm).to.closeTo(
            (0, utils_1.parseUnits)(`${gOHMUsdc / ftmUsdc}`, "ether"),
            gohmFtm.mul(2).div(100)
        );
    });
});
const getTokenPriceFromCoingecko = async function (tokenAddr) {
    const apiUrl = `https://api.coingecko.com/api/v3/simple/token_price/fantom?contract_addresses=${tokenAddr}&vs_currencies=usd`;
    const response = await axios_1.default.get(apiUrl);
    return response.data[tokenAddr.toLocaleLowerCase()].usd;
};
