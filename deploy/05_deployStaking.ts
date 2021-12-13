import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../src/utils";
import {
    OlympusERC20Token__factory,
    OlympusStaking__factory,
    SOlympus__factory,
} from "../typechain";

import { OHM_DID } from "./01_deployOhm";
import { SOHM_DID } from "./02_deploysOhm";

export const STAKING_DID = "staking";
export const STAKING_EPOCH_LENGTH = 28800;

const deployStaking: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
    ethers,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: ohm } = await get<OlympusERC20Token__factory>("OlympusERC20Token");
    const { contract: sohm } = await get<SOlympus__factory>("sOlympus");
    const { contract: staking, deployment } = await deploy<OlympusStaking__factory>(
        "OlympusStaking",
        [ohm.address, sohm.address, STAKING_EPOCH_LENGTH, 0, 0]
    );
    if (deployment?.newlyDeployed) {
        await sohm.initialize(staking.address);
    }

    log("Staking:", staking.address);
};
export default deployStaking;
deployStaking.id = STAKING_DID;
deployStaking.tags = ["local", "test", STAKING_DID];
deployStaking.dependencies = [SOHM_DID, OHM_DID];
