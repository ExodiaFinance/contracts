import { expect } from "chai";
import hre from "hardhat";

import { TREASURY_DID } from "../deploy/03_deployTreasury";
import { OHM_SET_VAULT_DID } from "../deploy/04_setVault";
import { STAKING_DID } from "../deploy/05_deployStaking";
import { WARMUP_STAKING_DID } from "../deploy/06_deployStakingWarmup";
import { STAKING_HELPER_DID } from "../deploy/07_deployStakingHelper";
import { STAKING_DISTRIBUTOR_DID } from "../deploy/08_deployStakingDistributor";
import { MINT_DAI_DID } from "../deploy/15_mintDai";
import { MINT_OHM_DID } from "../deploy/16_mintOHM";
import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import mint from "../src/subdeploy/mint";
import toggleRights, { MANAGING } from "../src/subdeploy/toggleRights";
import { DAI_DECIMALS, OHM_DECIMALS, toWei } from "../src/utils";
import {
    DAI__factory,
    OlympusERC20Token__factory,
    OlympusTreasury__factory,
    SOlympus__factory,
    StakingHelperV2__factory,
} from "../typechain";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts } = xhre;

describe("test staking", function () {
    beforeEach(async function () {
        await deployments.fixture([STAKING_DID, TREASURY_DID]);
    });

    it("Should be able to stake", async function () {
        const { deployer } = await getNamedAccounts();
        const { contract: stakingHelper } = await get<StakingHelperV2__factory>(
            "StakingHelperV2"
        );
        const { contract: sohm } = await get<SOlympus__factory>("sOlympus");
        const { contract: ohm } = await get<OlympusERC20Token__factory>(
            "OlympusERC20Token"
        );
        const { contract: treasury } = await get<OlympusTreasury__factory>(
            "OlympusTreasury"
        );
        const { contract: dai } = await get<DAI__factory>("DAI");
        await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, deployer);
        await mint(deployer, treasury, dai, toWei(1, DAI_DECIMALS));

        const ohmBalance = await ohm.balanceOf(deployer);
        expect(ohmBalance.toString()).to.eq(toWei(1, OHM_DECIMALS));

        await ohm.approve(stakingHelper.address, toWei(1, OHM_DECIMALS));
        await stakingHelper.stake(toWei(1, OHM_DECIMALS), deployer);

        const sohmBalance = await sohm.balanceOf(deployer);
        expect(sohmBalance.toString()).to.eq(toWei(1, OHM_DECIMALS));
    });
});
