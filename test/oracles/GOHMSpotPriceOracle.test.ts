import { expect } from "chai";
import hre from "hardhat";
import {
    GOHM_ADDRESS,
    GOHM_ORACLE_DID,
    HEC_ADDRESS,
    SPIRIT_ROUTER,
    USDC_ADDRESS,
} from "../../deploy/21_deployGOHMSpotPriceOracle";
import { IExodiaContractsRegistry } from "../../src/contracts/exodiaContracts";
import { IExtendedHRE } from "../../src/HardhatRegistryExtension/ExtendedHRE";
import { toWei, WOHM_DECIMALS } from "../../src/utils";
import {
    GOHMSpotPriceOracle,
    GOHMSpotPriceOracle__factory,
    IUniswapV2Router__factory,
} from "../../typechain";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, deploy } = xhre;

export const DAI_ADDRESS = "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e";

describe("GOHMSpotPriceOracle", function () {
    let oracle: GOHMSpotPriceOracle;
    let deployer: string;
    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
        await deployments.fixture([GOHM_ORACLE_DID]);
        const oracleDeployment = await get<GOHMSpotPriceOracle__factory>(
            "GOHMSpotPriceOracle"
        );
        oracle = oracleDeployment.contract;
    });

    it("getAmountsOut spiritswap router", async function () {
        const router = IUniswapV2Router__factory.connect(
            SPIRIT_ROUTER,
            await xhre.ethers.getSigner(deployer)
        );
        const amounts = await router.getAmountsOut(toWei(1, WOHM_DECIMALS), [
            GOHM_ADDRESS,
            HEC_ADDRESS,
            USDC_ADDRESS,
        ]);
        expect(amounts.length).to.eq(3);
    });

    it("should return a price", async function () {
        const { answer: price } = await oracle.latestRoundData();
        console.log("gOHM price", price.toNumber());
        expect(price).to.not.be.undefined;
    });
});
