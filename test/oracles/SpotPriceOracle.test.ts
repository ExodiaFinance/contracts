import { expect } from "chai";
import hre from "hardhat";
import { SPOOKY_SWAP_ROUTER } from "../../deploy/18_addSpookyLP";
import {
    GOHM_ADDRESS,
    GOHM_ORACLE_DID,
    HEC_ADDRESS,
    SPIRIT_ROUTER,
    USDC_ADDRESS,
} from "../../deploy/21_deployGOHMPriceOracle";
import { IExodiaContractsRegistry } from "../../packages/sdk/contracts/exodiaContracts";
import { IExtendedHRE } from "../../packages/HardhatRegistryExtension/ExtendedHRE";
import { toWei, WOHM_DECIMALS } from "../../packages/utils/utils";
import {
    GOHMSpotPriceOracle,
    GOHMSpotPriceOracle__factory,
    IUniswapV2Router__factory,
    SpotPriceOracle__factory,
} from "../../packages/sdk/typechain";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, deploy } = xhre;

export const DAI_ADDRESS = "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e";
export const WFTM_ADDRESS = "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83";
export const BOO_ADDRESS = "0x841FAD6EAe12c286d1Fd18d1d525DFfA75C7EFFE";

describe("GOHMSpotPriceOracle", function () {
    let deployer: string;
    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
    });

    it("should return a price (path length 2)", async function () {
        const { contract } = await deploy<GOHMSpotPriceOracle__factory>(
            "GOHMSpotPriceOracle",
            [WFTM_ADDRESS, USDC_ADDRESS]
        );
        await contract.updatePath(SPOOKY_SWAP_ROUTER, [WFTM_ADDRESS, USDC_ADDRESS]);

        const { answer: price } = await contract.latestRoundData();
        console.log("WFTM/USDC ratio", price.toNumber());
        expect(price).to.not.be.undefined;
    });

    it("should return a price (path length 3)", async function () {
        const deployment = await deployments.deploy("GOHMSpotPriceOracle", {
            args: [BOO_ADDRESS, USDC_ADDRESS],
        });
        const contract = SpotPriceOracle__factory.connect(deployment.address);
        await contract.updatePath(SPOOKY_SWAP_ROUTER, [
            BOO_ADDRESS,
            WFTM_ADDRESS,
            USDC_ADDRESS,
        ]);

        const { answer: price } = await contract.latestRoundData();
        console.log("BOO/USDC ratio", price.toNumber());
        expect(price).to.not.be.undefined;
    });
});
