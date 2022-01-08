import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/dist/src/types";

import { OlympusBondDepository__factory, RedeemHelper__factory } from "../../typechain";
import { ZERO_ADDRESS } from "./deployBasics";

export default async function deployBonds(
    ethers: HardhatEthersHelpers,
    ohmAddress: string,
    principle: string,
    treasuryAddress: string,
    daoAddress: string,
    stakingHelperAddress = "",
    redeemHelperAddress = "",
    bondCalculator = ZERO_ADDRESS
) {
    const bondFactory = await ethers.getContractFactory<OlympusBondDepository__factory>(
        "OlympusBondDepository"
    );
    const bond = await bondFactory.deploy(
        ohmAddress,
        principle,
        treasuryAddress,
        daoAddress,
        bondCalculator
    );
    await bond.setStaking(stakingHelperAddress, Boolean(stakingHelperAddress));
    if (redeemHelperAddress) {
        const redeemHelperFactory =
            await ethers.getContractFactory<RedeemHelper__factory>("RedeemHelper");
        const redeemHelper = redeemHelperFactory.attach(redeemHelperAddress);
        await redeemHelper.addBondContract(bond.address);
    }
    return bond;
}
