import { expect } from "chai";
import hre from "hardhat";

import { GOHM_ORACLE_DID } from "../../deploy/21_deployGOHMPriceOracle";
import { externalAddressRegistry } from "../../src/contracts";
import { IExodiaContractsRegistry } from "../../src/contracts/exodiaContracts";
import { IExtendedHRE } from "../../src/HardhatRegistryExtension/ExtendedHRE";
import {
    AggregatorV3Interface__factory,
    GOHMPriceOracle,
    GOHMPriceOracle__factory,
} from "../../typechain";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, deploy, getNetwork } = xhre;

export const DAI_ADDRESS = "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e";

describe("GOHMSpotPriceOracle", function () {
    let oracle: GOHMPriceOracle;
    let deployer: string;
    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
        await deployments.fixture([GOHM_ORACLE_DID]);
        const oracleDeployment = await get<GOHMPriceOracle__factory>("GOHMPriceOracle");
        oracle = oracleDeployment.contract;
    });

    it("should return a ohm * index", async function () {
        const { OHM_INDEX_FEED, OHM_USD_FEED } = externalAddressRegistry.forNetwork(
            await getNetwork()
        );
        const signer = await xhre.ethers.getSigner(deployer);
        const ohmPrice = await AggregatorV3Interface__factory.connect(
            OHM_USD_FEED,
            signer
        ).latestAnswer();
        const ohmIndex = await AggregatorV3Interface__factory.connect(
            OHM_INDEX_FEED,
            signer
        ).latestAnswer();
        const { answer: price } = await oracle.latestRoundData();
        console.log(price.toString());
        expect(price).to.eq(ohmPrice.mul(ohmIndex).div(1e9));
    });
});
