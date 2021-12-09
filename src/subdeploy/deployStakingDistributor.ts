import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/dist/src/types";
import { BigNumberish } from "ethers";

import { Distributor__factory } from "../../typechain";

export default async function deployStakingDistributor(
    ethers: HardhatEthersHelpers,
    treasuryAddress: string,
    ohmAddress: string,
    epochLength: BigNumberish,
    nextEpochBlock: BigNumberish
) {
    const distributorFactory =
        await ethers.getContractFactory<Distributor__factory>("Distributor");
    return distributorFactory.deploy(
        treasuryAddress,
        ohmAddress,
        epochLength,
        nextEpochBlock
    );
}
