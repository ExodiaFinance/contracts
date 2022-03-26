import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { externalAddressRegistry } from "../packages/sdk";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import {
    ExodiaRoles__factory,
    PriceProvider__factory,
    SolidlyTWAPOracle__factory,
    StrategyWhitelist__factory,
} from "../packages/sdk/typechain";
import { exec, ifNotProd, log } from "../packages/utils/utils";

import { EXODIA_ROLES_DID } from "./38_deployExodiaRoles";
import { PRICE_PROVIDER_DID } from "./44_deployPriceProvider";

export const SOLIDLY_TWAP_ORACLE_DID = "solidly_oracle";

const deployStrategyWhitelist: IExtendedDeployFunction<IExodiaContractsRegistry> =
    async ({ deploy, get, getNetwork }: IExtendedHRE<IExodiaContractsRegistry>) => {
        const { contract: oracle, deployment } = await deploy<SolidlyTWAPOracle__factory>(
            "SolidlyTWAPOracle",
            []
        );
        if (deployment?.newlyDeployed) {
            const { contract: roles } = await get<ExodiaRoles__factory>("ExodiaRoles");
            const { contract: pp } = await get<PriceProvider__factory>("PriceProvider");
            const { WFTM } = externalAddressRegistry.forNetwork(await getNetwork());
            await exec(() => oracle.initialize(WFTM, pp.address, roles.address));
        }
        log("Solidly TWAP oracle", oracle.address);
    };

export default deployStrategyWhitelist;
deployStrategyWhitelist.id = SOLIDLY_TWAP_ORACLE_DID;
deployStrategyWhitelist.tags = ["local", "test", SOLIDLY_TWAP_ORACLE_DID];
deployStrategyWhitelist.dependencies = ifNotProd([EXODIA_ROLES_DID, PRICE_PROVIDER_DID]);
