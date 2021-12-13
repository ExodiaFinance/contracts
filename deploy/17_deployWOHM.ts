import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../src/utils";
import {
    OlympusERC20Token__factory,
    OlympusStaking__factory,
    SOlympus__factory,
    StakingHelperV2__factory,
    WOHM__factory,
} from "../typechain";

import { OHM_DID } from "./01_deployOhm";
import { SOHM_DID } from "./02_deploysOhm";
import { STAKING_DID } from "./05_deployStaking";
import { STAKING_HELPER_DID } from "./07_deployStakingHelper";

export const WOHM_DID = "wohm_token";

const deployWOHM: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: ohm } = await get<OlympusERC20Token__factory>("OlympusERC20Token");
    const { contract: sohm } = await get<SOlympus__factory>("sOlympus");
    const { contract: staking } = await get<StakingHelperV2__factory>("OlympusStaking");
    const { contract: wohm } = await deploy<WOHM__factory>("wOHM", [
        staking.address,
        ohm.address,
        sohm.address,
    ]);

    log("wOHM:", wohm.address);
};
export default deployWOHM;
deployWOHM.id = WOHM_DID;
deployWOHM.tags = ["local", "test", WOHM_DID];
deployWOHM.dependencies = [STAKING_DID, SOHM_DID, OHM_DID];
