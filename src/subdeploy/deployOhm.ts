import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/dist/src/types";

import { OlympusERC20Token__factory } from "../../typechain";

export default async function deployOhm(ethers: HardhatEthersHelpers) {
    const OHM = await ethers.getContractFactory<OlympusERC20Token__factory>(
        "OlympusERC20Token"
    );
    return OHM.deploy();
}
