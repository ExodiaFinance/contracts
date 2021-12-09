import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/dist/src/types";

import deployBondCalculator from "./deployBondCalculator";
import deployOhm from "./deployOhm";
import deployRedeemHelper from "./deployRedeemHelper";
import deploySohm from "./deploySohm";
import deployStaking from "./deployStaking";
import deployTreasury from "./deployTreasury";
import toggleRights, { MANAGING } from "./toggleRights";

export const zeroAddress = "0x0000000000000000000000000000000000000000";

export default async function deployBasics(
    ethers: HardhatEthersHelpers,
    daiAddress: string,
    rr = "3000"
) {
    const [deployer] = await ethers.getSigners();
    const ohm = await deployOhm(ethers);
    const sohm = await deploySohm(ethers);
    await sohm.setIndex(1);
    const treasury = await deployTreasury(ethers, ohm.address, daiAddress);
    await ohm.setVault(treasury.address);
    const stakingDeployment = await deployStaking(
        ethers,
        treasury.address,
        ohm.address,
        sohm.address,
        28800,
        rr
    );

    await sohm.initialize(stakingDeployment.staking.address);
    await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, daiAddress);
    await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, deployer.address);
    await toggleRights(
        treasury,
        MANAGING.REWARDMANAGER,
        stakingDeployment.distributor.address
    );
    await toggleRights(treasury, MANAGING.LIQUIDITYDEPOSITOR, deployer.address);
    const bondCalculator = await deployBondCalculator(ethers, ohm.address);
    const redeemHelper = await deployRedeemHelper(ethers);
    return {
        ohm,
        sohm,
        treasury,
        bondCalculator,
        redeemHelper,
        ...stakingDeployment,
    };
}
