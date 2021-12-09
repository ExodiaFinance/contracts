import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/dist/src/types";

import { RedeemHelper__factory } from "../../typechain";

export default async function deployRedeemHelper(ethers: HardhatEthersHelpers) {
    const redeemHelperFactory = await ethers.getContractFactory<RedeemHelper__factory>(
        "RedeemHelper"
    );
    return redeemHelperFactory.deploy();
}
