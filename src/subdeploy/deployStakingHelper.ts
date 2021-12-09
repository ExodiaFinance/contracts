import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/dist/src/types";
import { StakingHelper__factory } from "../../typechain";

export default async function deployStakingHelper(
    ethers: HardhatEthersHelpers,
    stakingAddress: string,
    ohmAddress: string
) {
    const stakingHelperFactory = await ethers.getContractFactory<StakingHelper__factory>(
        "StakingHelperV2"
    );
    return stakingHelperFactory.deploy(stakingAddress, ohmAddress);
}
