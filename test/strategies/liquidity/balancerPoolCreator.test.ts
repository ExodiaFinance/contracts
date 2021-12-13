import { expect } from "chai";
import hre from "hardhat";
import { DAI_DID } from "../../../deploy/00_deployDai";
import { OHM_DID } from "../../../deploy/01_deployOhm";

import { TREASURY_DID } from "../../../deploy/03_deployTreasury";
import { MINT_DAI_DID } from "../../../deploy/15_mintDai";
import { IExodiaContractsRegistry } from "../../../src/contracts/exodiaContracts";
import { IExtendedHRE } from "../../../src/HardhatRegistryExtension/ExtendedHRE";
import mint from "../../../src/subdeploy/mint";
import { DAI_DECIMALS, OHM_DECIMALS, toWei } from "../../../src/utils";

import {
    BalancerPoolCreator__factory,
    DAI,
    DAI__factory,
    OlympusERC20Token,
    OlympusERC20Token__factory,
    OlympusTreasury,
    OlympusTreasury__factory,
} from "../../../typechain";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, deploy } = xhre;

const BEETHOVEN_POOL_FACTORY = "0x60467cb225092cE0c989361934311175f437Cf53";
const FLOATING_POINT_DECIMALS = 18;
describe("test treasury", function () {
    let dai: DAI;
    let treasury: OlympusTreasury;
    let ohm: OlympusERC20Token;

    beforeEach(async function () {
        await deployments.fixture([MINT_DAI_DID, OHM_DID, TREASURY_DID]);
        const { contract: treasuryContract } = await get<OlympusTreasury__factory>(
            "OlympusTreasury"
        );
        treasury = treasuryContract;
        const { contract: daiContract } = await get<DAI__factory>("DAI");
        dai = daiContract;
        ohm = (await get<OlympusERC20Token__factory>("OlympusERC20Token")).contract;
    });

    it("Should initialize a pool", async function () {
        const { deployer } = await getNamedAccounts();
        await mint(deployer, treasury, dai, toWei(100, DAI_DECIMALS));
        await dai.mint(deployer, toWei(100, DAI_DECIMALS));
        const { contract } = await deploy<BalancerPoolCreator__factory>(
            "BalancerPoolCreator",
            [BEETHOVEN_POOL_FACTORY]
        );
        const pool = await contract.initialize(
            "test-pool",
            "TP",
            toWei(0.003, FLOATING_POINT_DECIMALS),
            [ohm.address, dai.address],
            [toWei(0.7, FLOATING_POINT_DECIMALS), toWei(0.3, FLOATING_POINT_DECIMALS)],
            [toWei(7, OHM_DECIMALS), toWei(3, DAI_DECIMALS)]
        );
        expect(pool).to.not.be.undefined;
    });
});
