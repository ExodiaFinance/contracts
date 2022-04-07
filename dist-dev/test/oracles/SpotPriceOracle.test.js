"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOO_ADDRESS = exports.WFTM_ADDRESS = exports.DAI_ADDRESS = void 0;
const chai_1 = require("chai");
const hardhat_1 = __importDefault(require("hardhat"));
const _18_addSpookyLP_1 = require("../../deploy/18_addSpookyLP");
const _21_deployGOHMPriceOracle_1 = require("../../deploy/21_deployGOHMPriceOracle");
const typechain_1 = require("../../packages/sdk/typechain");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts, deploy } = xhre;
exports.DAI_ADDRESS = "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e";
exports.WFTM_ADDRESS = "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83";
exports.BOO_ADDRESS = "0x841FAD6EAe12c286d1Fd18d1d525DFfA75C7EFFE";
describe("GOHMSpotPriceOracle", function () {
    let deployer;
    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
    });
    it("should return a price (path length 2)", async function () {
        const { contract } = await deploy("GOHMSpotPriceOracle", [
            exports.WFTM_ADDRESS,
            _21_deployGOHMPriceOracle_1.USDC_ADDRESS,
        ]);
        await contract.updatePath(_18_addSpookyLP_1.SPOOKY_SWAP_ROUTER, [
            exports.WFTM_ADDRESS,
            _21_deployGOHMPriceOracle_1.USDC_ADDRESS,
        ]);
        const { answer: price } = await contract.latestRoundData();
        console.log("WFTM/USDC ratio", price.toNumber());
        (0, chai_1.expect)(price).to.not.be.undefined;
    });
    it("should return a price (path length 3)", async function () {
        const deployment = await deployments.deploy("GOHMSpotPriceOracle", {
            args: [exports.BOO_ADDRESS, _21_deployGOHMPriceOracle_1.USDC_ADDRESS],
        });
        const contract = typechain_1.SpotPriceOracle__factory.connect(deployment.address);
        await contract.updatePath(_18_addSpookyLP_1.SPOOKY_SWAP_ROUTER, [
            exports.BOO_ADDRESS,
            exports.WFTM_ADDRESS,
            _21_deployGOHMPriceOracle_1.USDC_ADDRESS,
        ]);
        const { answer: price } = await contract.latestRoundData();
        console.log("BOO/USDC ratio", price.toNumber());
        (0, chai_1.expect)(price).to.not.be.undefined;
    });
});
