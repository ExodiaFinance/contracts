import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/dist/src/types";

import { StakingWarmup__factory } from "../../typechain";

export default async function deployWarmup(
    ethers: HardhatEthersHelpers,
    stakingAddress: string,
    sohmAddress: string
) {
    const warmupFactory = await ethers.getContractFactory<StakingWarmup__factory>(
        "StakingWarmup"
    );
    return warmupFactory.deploy(stakingAddress, sohmAddress);
}
