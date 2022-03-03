import { externalAddressRegistry } from "../packages/sdk/contracts";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../packages/utils/utils";
import {
    LiquidLockStaking,
    LiquidLockStaking__factory,
    LLSRewardHandler__factory,
    MasterLock,
    MasterLock__factory,
    WOHM__factory,
} from "../packages/sdk/typechain";

import { WOHM_DID } from "./17_deployWOHM";
import { FNFT_MASTER_LOCK_DID } from "./28_deployFNFTMasterLock";

export const LIQUID_LOCK_STAKING_DID = "liquid_lock_staking";

const liquidLockStakingDeployment: IExtendedDeployFunction<IExodiaContractsRegistry> =
    async ({ get, deploy, getNetwork }: IExtendedHRE<IExodiaContractsRegistry>) => {
        const { contract: wohm } = await get<WOHM__factory>("wOHM");
        const { contract: masterLock } = await get<MasterLock__factory>("MasterLock");
        const { contract: rewardHandler } = await deploy<LLSRewardHandler__factory>(
            "LLSRewardHandler",
            [wohm.address]
        );
        const { REVEST_REGISTRY } = externalAddressRegistry.forNetwork(
            await getNetwork()
        );
        const { contract: staking, deployment } =
            await deploy<LiquidLockStaking__factory>("LiquidLockStaking", [
                wohm.address,
                rewardHandler.address,
                REVEST_REGISTRY,
                masterLock.address,
            ]);
        if (deployment?.newlyDeployed) {
            await rewardHandler.setStakingContract(staking.address);
        }

        log("Liquid Lock Staking:", staking.address);
        log("Lock staking reward handler", rewardHandler.address);
    };

export default liquidLockStakingDeployment;
liquidLockStakingDeployment.id = LIQUID_LOCK_STAKING_DID;
liquidLockStakingDeployment.tags = ["local", "test", LIQUID_LOCK_STAKING_DID];
liquidLockStakingDeployment.dependencies = [WOHM_DID, FNFT_MASTER_LOCK_DID];
