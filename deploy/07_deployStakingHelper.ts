import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import {
    OlympusERC20Token__factory,
    OlympusStaking__factory,
    StakingHelperV2__factory,
} from "../typechain";

import { OHM_DID } from "./01_deployOhm";
import { STAKING_DID } from "./05_deployStaking";

export const STAKING_HELPER_DID = "staking_helper";

const deployStakingHelper: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: ohm } = await get<OlympusERC20Token__factory>("OlympusERC20Token");
    const { contract: staking } = await get<OlympusStaking__factory>("OlympusStaking");
    const { contract } = await deploy<StakingHelperV2__factory>("StakingHelperV2", [
        staking.address,
        ohm.address,
    ]);
    console.log("StakingHelper:", contract.address);
};
export default deployStakingHelper;
deployStakingHelper.id = STAKING_HELPER_DID;
deployStakingHelper.tags = ["local", "test", STAKING_HELPER_DID, STAKING_DID];
deployStakingHelper.dependencies = [OHM_DID];
deployStakingHelper.runAtTheEnd = true;
