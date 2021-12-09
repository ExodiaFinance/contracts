import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/dist/src/types";
import { BigNumber, BigNumberish } from "ethers";

import { OlympusStaking__factory } from "../../typechain";

import deployStakingDistributor from "./deployStakingDistributor";
import deployStakingHelper from "./deployStakingHelper";
import deployWarmup from "./deployWarmup";

export default async function deployStaking(
    ethers: HardhatEthersHelpers,
    treasuryAddress: string,
    ohmAddress: string,
    sOhmAddress: string,
    epochLength: BigNumberish,
    initialRewardRate: BigNumberish
) {
    const currentBlock = await ethers.provider.getBlockNumber();
    const stakingFactory = await ethers.getContractFactory<OlympusStaking__factory>(
        "OlympusStaking"
    );
    const staking = await stakingFactory.deploy(
        ohmAddress,
        sOhmAddress,
        epochLength,
        currentBlock,
        currentBlock
    );
    const warmup = await deployWarmup(ethers, staking.address, sOhmAddress);
    await staking.setContract(1, warmup.address);
    const stakingHelper = await deployStakingHelper(ethers, staking.address, ohmAddress);
    const distributor = await deployStakingDistributor(
        ethers,
        treasuryAddress,
        ohmAddress,
        epochLength,
        BigNumber.from(currentBlock).add(epochLength)
    );
    await distributor.addRecipient(staking.address, initialRewardRate);
    await staking.setContract(0, distributor.address);
    return { staking, stakingHelper, distributor, warmup };
}
