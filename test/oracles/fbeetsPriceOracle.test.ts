import { expect } from "chai";
import hre from "hardhat";

import { GOHM_ORACLE_DID } from "../../deploy/21_deployGOHMPriceOracle";
import { FBEETS_ORACLE_DID } from "../../deploy/29_fBEETSOracleDeployment";
import { externalAddressRegistry } from "../../src/contracts";
import { IExodiaContractsRegistry } from "../../src/contracts/exodiaContracts";
import { IExtendedHRE } from "../../src/HardhatRegistryExtension/ExtendedHRE";
import {
    AggregatorV3Interface__factory,
    FBEETSPriceOracle,
    FBEETSPriceOracle__factory,
    IBalV2PriceOracle__factory,
    IERC20__factory,
} from "../../typechain";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, deploy, getNetwork } = xhre;

describe("GOHMSpotPriceOracle", function () {
    let oracle: FBEETSPriceOracle;
    let deployer: string;
    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
        await deployments.fixture([FBEETS_ORACLE_DID]);
        const oracleDeployment = await get<FBEETSPriceOracle__factory>(
            "fBEETSPriceOracle"
        );
        oracle = oracleDeployment.contract;
    });

    it("should return fbeets price", async function () {
        const { FTM_USD_FEED, FIDELIO_DUETTO, FBEETS_BAR } =
            externalAddressRegistry.forNetwork(await getNetwork());
        const { answer: fBeetsUsd } = await oracle.latestRoundData();
        const signer = await xhre.ethers.getSigner(deployer);
        const balOracle = IBalV2PriceOracle__factory.connect(FIDELIO_DUETTO, signer);
        const balOracleAnswer = await balOracle.getTimeWeightedAverage([
            { variable: 1, secs: 120, ago: 0 },
        ]);
        const bptFtm = balOracleAnswer[0];
        const ftmOracle = AggregatorV3Interface__factory.connect(FTM_USD_FEED, signer);
        const ftmOracleAnswer = await ftmOracle.latestRoundData();
        const ftmUsd = ftmOracleAnswer.answer;
        const bptUsd = bptFtm.mul(ftmUsd).div(1e9).div(1e9);
        const fBeetsSupply = await IERC20__factory.connect(
            FBEETS_BAR,
            signer
        ).totalSupply();
        const lockedBpt = await IERC20__factory.connect(FIDELIO_DUETTO, signer).balanceOf(
            FBEETS_BAR
        );
        const expectedFBeetsUsd = bptUsd.mul(lockedBpt).div(fBeetsSupply);
        expect(fBeetsUsd).to.be.gt(bptUsd);
        expect(fBeetsUsd).to.closeTo(expectedFBeetsUsd, 1e3);
    });
});
