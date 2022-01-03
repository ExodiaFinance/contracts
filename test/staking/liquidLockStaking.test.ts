import { ethers } from "ethers";
import hre from "hardhat";
import { expect } from "chai";
import { MINT_OHM_DID } from "../../deploy/16_mintOHM";

import { LIQUID_LOCK_STAKING_DID } from "../../deploy/24_liquidLockStakingDeployment";
import { IExodiaContractsRegistry } from "../../src/contracts/exodiaContracts";
import { IExtendedHRE } from "../../src/HardhatRegistryExtension/ExtendedHRE";
import mint from "../../src/subdeploy/mint";
import { DAI_DECIMALS, OHM_DECIMALS, toWei } from "../../src/utils";
import balance from "../../tasks/balance";
import {
    DAI,
    DAI__factory,
    LiquidLockStaking,
    LiquidLockStaking__factory,
    LLSRewardHandler,
    OlympusERC20Token,
    OlympusERC20Token__factory,
    OlympusTreasury,
    OlympusTreasury__factory,
    WOHM,
    WOHM__factory,
} from "../../typechain";
import { RewardsHandler__factory } from "../../typechain/factories/RewardsHandler__factory";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, deploy, getNamedAccounts } = xhre;

const parseUnits = ethers.utils.parseUnits;

describe("LiquidLockStaking", function () {
    let deployer: string;
    let wsexod: WOHM;
    let exod: OlympusERC20Token;
    let liquidLockStaking: LiquidLockStaking;
    let rewardHandler: LLSRewardHandler;
    let dai: DAI;
    let treasury: OlympusTreasury;
    beforeEach(async function () {
        const accounts = await getNamedAccounts();
        deployer = accounts.deployer;
        await deployments.fixture([LIQUID_LOCK_STAKING_DID, MINT_OHM_DID]);
        const treasuryDeployment = await get<OlympusTreasury__factory>("OlympusTreasury");
        treasury = treasuryDeployment.contract;
        const wohmDeployment = await get<WOHM__factory>("wOHM");
        wsexod = wohmDeployment.contract;
        const daiDeployment = await get<DAI__factory>("DAI");
        dai = daiDeployment.contract;
        const ohmDeployment = await get<OlympusERC20Token__factory>("OlympusERC20Token");
        exod = ohmDeployment.contract;
        const llsDeployment = await get<LiquidLockStaking__factory>("LiquidLockStaking");

        liquidLockStaking = llsDeployment.contract;
        const rewardHandlerDeployment = await get<RewardsHandler__factory>(
            "LLSRewardHandler"
        );
        rewardHandler = rewardHandlerDeployment.contract;

        // Mint wsEXOD
        await mint(deployer, treasury, dai, toWei(100, DAI_DECIMALS));
        await exod.approve(wsexod.address, toWei(100, OHM_DECIMALS));
        await wsexod.wrapFromOHM(toWei(100, OHM_DECIMALS));
    });

    it("Should stake", async function () {
        const wsExodBal = await wsexod.balanceOf(deployer);
        // console.log(liquidLockStaking);
        await wsexod.approve(liquidLockStaking.address, wsExodBal);
        const fnftId = await liquidLockStaking.stake(wsExodBal.mul(90).div(100), 3, {
            value: parseUnits("3", "ether"),
        });
    });
});
