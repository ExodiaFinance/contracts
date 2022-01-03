import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../src/utils";
import {
    LiquidLockStaking,
    LiquidLockStaking__factory,
    LLSRewardHandler__factory,
    WOHM__factory,
} from "../typechain";
import { WOHM_DID } from "./17_deployWOHM";

export const LIQUID_LOCK_STAKING_DID = "liquid_lock_staking";
export const REVEST_ADDRESS_REGISTRY = "0xe0741aE6a8A6D87A68B7b36973d8740704Fd62B9";

const liquidLockStakingDeployment: IExtendedDeployFunction<IExodiaContractsRegistry> =
    async ({ get, deploy }: IExtendedHRE<IExodiaContractsRegistry>) => {
        const { contract: wohm } = await get<WOHM__factory>("wOHM");
        const { contract: rewardHandler } = await deploy<LLSRewardHandler__factory>(
            "LLSRewardHandler",
            [wohm.address]
        );
        const { contract: staking, deployment } =
            await deploy<LiquidLockStaking__factory>("LiquidLockStaking", [
                wohm.address,
                rewardHandler.address,
                REVEST_ADDRESS_REGISTRY,
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
liquidLockStakingDeployment.dependencies = [WOHM_DID];
