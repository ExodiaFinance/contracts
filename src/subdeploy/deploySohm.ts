import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/dist/src/types";
import { SOlympus__factory } from "../../typechain";

export default async function deploySohm(ethers: HardhatEthersHelpers) {
    const sOHM = await ethers.getContractFactory<SOlympus__factory>("sOlympus");
    return sOHM.deploy();
}
