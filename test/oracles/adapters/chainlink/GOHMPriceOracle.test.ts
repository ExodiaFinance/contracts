import axios from "axios";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import hre from "hardhat";

import { GOHM_ORACLE_DID } from "../../../../deploy/21_deployGOHMPriceOracle";
import { IExtendedHRE } from "../../../../packages/HardhatRegistryExtension/ExtendedHRE";
import { externalAddressRegistry } from "../../../../packages/sdk/contracts";
import { IExodiaContractsRegistry } from "../../../../packages/sdk/contracts/exodiaContracts";
import {
    AggregatorV3Interface__factory,
    GOHMPriceOracle,
    GOHMPriceOracle__factory,
} from "../../../../packages/sdk/typechain";

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

    it("should return gOHM priced in FTM", async function () {
        const { GOHM, WFTM } = externalAddressRegistry.forNetwork(await getNetwork());
        const signer = await xhre.ethers.getSigner(deployer);

        const gOHMUsdc = await getTokenPriceFromCoingecko(GOHM);
        const ftmUsdc = await getTokenPriceFromCoingecko(WFTM);
        const gohmFtm = await oracle.getCurrentPrice(GOHM);
        console.log(gohmFtm.toString());
        expect(gohmFtm).to.closeTo(
            parseUnits(`${gOHMUsdc / ftmUsdc}`, "ether"),
            gohmFtm.mul(2).div(100) as any
        );
    });
});
const getTokenPriceFromCoingecko = async function (tokenAddr: string) {
    const apiUrl = `https://api.coingecko.com/api/v3/simple/token_price/fantom?contract_addresses=${tokenAddr}&vs_currencies=usd`;
    const response = await axios.get(apiUrl);
    return response.data[tokenAddr.toLocaleLowerCase()].usd;
};
