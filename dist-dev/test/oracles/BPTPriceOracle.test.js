"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.A_LATE_QUARTET =
    exports.BEETHOVEN_VAULT =
    exports.BEETHOVEN_SUBGRAPH =
    exports.USDC_ADDRESS =
    exports.WBTC_ADDRESS =
        void 0;
const utils_1 = require("ethers/lib/utils");
const hardhat_1 = __importDefault(require("hardhat"));
const typechain_1 = require("../../packages/sdk/typechain");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts, deploy } = xhre;
exports.WBTC_ADDRESS = "0x321162Cd933E2Be498Cd2267a90534A804051b11";
exports.USDC_ADDRESS = "0x04068da6c83afcfa0e13ba15a6696662335d5b75";
exports.BEETHOVEN_SUBGRAPH =
    "https://graph-node.beets-ftm-node.com/subgraphs/name/beethovenx";
exports.BEETHOVEN_VAULT = "0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce";
exports.A_LATE_QUARTET =
    "0xf3a602d30dcb723a74a0198313a7551feaca7dac00010000000000000000005f";
describe("Beethoven X BPT oracle", function () {
    let deployer;
    let oracle;
    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
        const oracleDeployment = await deployments.deploy("BPTPriceOracle", {
            args: [exports.USDC_ADDRESS],
            from: deployer,
        });
        const signer = await xhre.ethers.getSigner(deployer);
        oracle = typechain_1.BPTPriceOracle__factory.connect(
            oracleDeployment.address,
            signer
        );
        await oracle.setup(
            exports.BEETHOVEN_VAULT,
            exports.A_LATE_QUARTET,
            0,
            (0, utils_1.parseUnits)("0.25", "ether")
        );
    });
    it("Should get the price of 1 BPT with 8 decimals", async function () {
        const price = await oracle.getPrice();
        console.log(price.toString());
    });
});
