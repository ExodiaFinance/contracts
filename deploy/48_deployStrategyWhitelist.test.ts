import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import {
    ExodiaRoles__factory,
    StrategyWhitelist__factory,
} from "../packages/sdk/typechain";
import { exec, log } from "../packages/utils/utils";

import { EXODIA_ROLES_DID } from "./38_deployExodiaRoles";

export const STRATEGY_WHITELIST_DID = "strategy_whitelist";

const deployStrategyWhitelist: IExtendedDeployFunction<IExodiaContractsRegistry> =
    async ({ deploy, get, getNetwork }: IExtendedHRE<IExodiaContractsRegistry>) => {
        const { contract: wl, deployment } = await deploy<StrategyWhitelist__factory>(
            "StrategyWhitelist",
            []
        );
        if (deployment?.newlyDeployed) {
            const { contract: roles } = await get<ExodiaRoles__factory>("ExodiaRoles");
            await exec(() => wl.initialize(roles.address));
        }
        log("Strategy Whitelist", wl.address);
    };

export default deployStrategyWhitelist;
deployStrategyWhitelist.id = STRATEGY_WHITELIST_DID;
deployStrategyWhitelist.tags = ["local", "test", STRATEGY_WHITELIST_DID];
deployStrategyWhitelist.dependencies = [EXODIA_ROLES_DID];
