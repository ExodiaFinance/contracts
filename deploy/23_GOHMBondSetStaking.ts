import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../src/utils";
import { GOHMBondDepository__factory, StakingHelperV2__factory } from "../typechain";

import { STAKING_HELPER_DID } from "./07_deployStakingHelper";
import { GOHM_BOND_DID } from "./22_deployGOHMBonds";

export const GOHM_BOND_SET_STAKING_DID = "dai_bond_set_staking";

const setStakingGOHMBond: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    get,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: stakingHelper } = await get<StakingHelperV2__factory>(
        "StakingHelperV2"
    );
    const { contract: bond } = await get<GOHMBondDepository__factory>(
        "GOHMBondDepository"
    );
    const bondStakingHelperAddress = await bond.stakingHelper();
    if (stakingHelper.address !== bondStakingHelperAddress) {
        await bond.setStaking(stakingHelper.address, true);
        log(
            "gohm bond StakingHelper address updated:",
            bondStakingHelperAddress,
            " -> ",
            stakingHelper.address
        );
    }
};
export default setStakingGOHMBond;
setStakingGOHMBond.id = GOHM_BOND_SET_STAKING_DID;
setStakingGOHMBond.tags = ["local", "test", GOHM_BOND_SET_STAKING_DID];
setStakingGOHMBond.dependencies = [STAKING_HELPER_DID, GOHM_BOND_DID];
