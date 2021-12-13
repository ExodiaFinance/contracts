import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../src/utils";
import {
    OlympusStaking__factory,
    SOlympus__factory,
    StakingWarmup__factory,
} from "../typechain";

import { SOHM_DID } from "./02_deploysOhm";
import { STAKING_DID } from "./05_deployStaking";

export const WARMUP_STAKING_DID = "staking_warmup";

const deployStakingWarmup: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: sohm } = await get<SOlympus__factory>("sOlympus");
    const { contract: staking } = await get<OlympusStaking__factory>("OlympusStaking");
    const { contract: warmup, deployment } = await deploy<StakingWarmup__factory>(
        "StakingWarmup",
        [staking.address, sohm.address]
    );
    if (deployment?.newlyDeployed) {
        await staking.setContract(1, warmup.address);
    }
    log("StakingWarmup:", warmup.address);
};
export default deployStakingWarmup;
deployStakingWarmup.id = WARMUP_STAKING_DID;
deployStakingWarmup.tags = ["local", "test", WARMUP_STAKING_DID, STAKING_DID];
deployStakingWarmup.dependencies = [SOHM_DID];
deployStakingWarmup.runAtTheEnd = true;
