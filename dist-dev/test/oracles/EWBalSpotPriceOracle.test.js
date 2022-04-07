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
const sor_1 = require("@balancer-labs/sor");
const ethers_1 = require("ethers");
const hardhat_1 = __importDefault(require("hardhat"));
const Network_1 = require("../../packages/sdk/contracts/Network");
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
describe("Beethoven X interactions", function () {
    let deployer;
    let sor;
    let oracle;
    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
        const provider = xhre.ethers.provider;
        // @ts-ignore
        sor = new sor_1.SOR(
            provider,
            Network_1.Network.OPERA_MAIN_NET,
            exports.BEETHOVEN_SUBGRAPH
        );
        const oracleDeployment = await deployments.deploy("EWBalSpotPriceOracle", {
            args: [exports.WBTC_ADDRESS, exports.USDC_ADDRESS],
            from: deployer,
        });
        const signer = await xhre.ethers.getSigner(deployer);
        oracle = typechain_1.EWBalSpotPriceOracle__factory.connect(
            oracleDeployment.address,
            signer
        );
        await oracle.updatePool(exports.BEETHOVEN_VAULT, exports.A_LATE_QUARTET, 2, 0);
    });
    it("Should get the price from the sor", async function () {
        const info = await sor.getSwaps(
            exports.USDC_ADDRESS,
            exports.WBTC_ADDRESS,
            sor_1.SwapTypes.SwapExactOut,
            ethers_1.ethers.utils.parseUnits("1", "ether")
        );
    });
    it("Should get the price from the pool balance", async function () {
        const price = await oracle.getPrice();
        console.log(price.toString());
    });
});
