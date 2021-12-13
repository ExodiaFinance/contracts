import { expect } from "chai";
import hre from "hardhat";
import sohmDeployment from "../deploy/02_deploysOhm";

import { TREASURY_DID } from "../deploy/03_deployTreasury";
import { STAKING_DID } from "../deploy/05_deployStaking";
import { WOHM_DID } from "../deploy/17_deployWOHM";
import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import mint from "../src/subdeploy/mint";
import toggleRights, { MANAGING } from "../src/subdeploy/toggleRights";
import { DAI_DECIMALS, OHM_DECIMALS, toWei, WOHM_DECIMALS } from "../src/utils";
import {
    DAI__factory,
    OlympusERC20Token__factory,
    OlympusTreasury__factory,
    SOlympus__factory,
    StakingHelperV2__factory,
    WOHM__factory,
} from "../typechain";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts } = xhre;

describe("test wOHM", function () {
    beforeEach(async function () {
        await deployments.fixture([WOHM_DID, TREASURY_DID, STAKING_DID]);
    });

    it("Should be able to wrap/unwrap from OHM", async function () {
        const { deployer } = await getNamedAccounts();
        const { contract: ohm } = await get<OlympusERC20Token__factory>(
            "OlympusERC20Token"
        );
        const { contract: sohm } = await get<SOlympus__factory>("sOlympus");
        const { contract: treasury } = await get<OlympusTreasury__factory>(
            "OlympusTreasury"
        );
        const { contract: dai } = await get<DAI__factory>("DAI");
        const { contract: wohm } = await get<WOHM__factory>("wOHM");
        await mint(deployer, treasury, dai, toWei(1, DAI_DECIMALS));

        const ohmBalance = await ohm.balanceOf(deployer);
        expect(ohmBalance.toString()).to.eq(toWei(1, OHM_DECIMALS));

        await ohm.approve(wohm.address, toWei(1, OHM_DECIMALS));
        await wohm.wrapFromOHM(toWei(1, OHM_DECIMALS));

        const wohmBalance = await wohm.balanceOf(deployer);
        const wohmSohmBalance = await sohm.balanceOf(wohm.address);
        expect(wohmBalance.toString()).to.eq(toWei(1, WOHM_DECIMALS));
        expect(wohmSohmBalance.toString()).to.eq(toWei(1, OHM_DECIMALS));
        await wohm.unwrapToOHM(toWei(1, WOHM_DECIMALS));

        const unstakedOhm = await ohm.balanceOf(deployer);
        expect(unstakedOhm.toString()).to.eq(toWei(1, OHM_DECIMALS));
    });

    it("Should be able to wrap/unwrap from sOHM", async function () {
        const { deployer } = await getNamedAccounts();
        const { contract: stakingHelper } = await get<StakingHelperV2__factory>(
            "StakingHelperV2"
        );
        const { contract: ohm } = await get<OlympusERC20Token__factory>(
            "OlympusERC20Token"
        );
        const { contract: sohm } = await get<SOlympus__factory>("sOlympus");
        const { contract: treasury } = await get<OlympusTreasury__factory>(
            "OlympusTreasury"
        );
        const { contract: dai } = await get<DAI__factory>("DAI");
        const { contract: wohm } = await get<WOHM__factory>("wOHM");
        await mint(deployer, treasury, dai, toWei(1, DAI_DECIMALS));

        const ohmBalance = await ohm.balanceOf(deployer);
        expect(ohmBalance.toString()).to.eq(toWei(1, OHM_DECIMALS));

        await ohm.approve(stakingHelper.address, toWei(1, OHM_DECIMALS));
        await stakingHelper.stake(toWei(1, OHM_DECIMALS), deployer);

        await sohm.approve(wohm.address, toWei(1, OHM_DECIMALS));
        await wohm.wrapFromsOHM(toWei(1, OHM_DECIMALS));

        const wohmBalance = await wohm.balanceOf(deployer);
        expect(wohmBalance.toString()).to.eq(toWei(1, WOHM_DECIMALS));
        await wohm.unwrapTosOHM(toWei(1, WOHM_DECIMALS));

        const sohmBalance = await sohm.balanceOf(deployer);
        expect(sohmBalance.toString()).to.eq(toWei(1, OHM_DECIMALS));
    });
});
