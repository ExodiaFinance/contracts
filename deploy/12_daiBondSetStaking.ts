import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../packages/utils/utils";
import {
    OlympusBondDepository__factory,
    StakingHelperV2__factory,
} from "../packages/sdk/typechain";

import { STAKING_HELPER_DID } from "./07_deployStakingHelper";
import { DAI_BOND_DID } from "./11_deployDaiBond";

export const DAI_BOND_SET_STAKING_DID = "dai_bond_set_staking";

const setStakingDaiBond: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    get,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: stakingHelper } = await get<StakingHelperV2__factory>(
        "StakingHelperV2"
    );
    const { contract: bond } = await get<OlympusBondDepository__factory>(
        "DAIBondDepository"
    );
    const bondStakingHelperAddress = await bond.stakingHelper();
    if (stakingHelper.address !== bondStakingHelperAddress) {
        await bond.setStaking(stakingHelper.address, true);
        log(
            "Dai bond StakingHelper address updated:",
            bondStakingHelperAddress,
            " -> ",
            stakingHelper.address
        );
    }
};
export default setStakingDaiBond;
setStakingDaiBond.id = DAI_BOND_SET_STAKING_DID;
setStakingDaiBond.tags = ["local", "test", DAI_BOND_SET_STAKING_DID];
setStakingDaiBond.dependencies = [STAKING_HELPER_DID, DAI_BOND_DID];
