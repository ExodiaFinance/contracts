import { IExtendedDeployFunction } from "../../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExodiaContractsRegistry } from "../../packages/sdk/contracts/exodiaContracts";
import { GOHMPriceOracle__factory } from "../../packages/sdk/typechain";
import { GOHM_ORACLE_DID } from "../21_deployGOHMPriceOracle";
import { PRICE_PROVIDER_DID } from "../44_deployPriceProvider";

import { configTokenOracleFactory } from "./configOracles";

export const CONFIG_GOHM_ORACLE = "pp_config_gohm";

const configGohmPP: IExtendedDeployFunction<IExodiaContractsRegistry> =
    configTokenOracleFactory(async (xhre, registry) => {
        const { contract: oracle } = await xhre.get<GOHMPriceOracle__factory>(
            "GOHMPriceOracle"
        );
        const tokenAddress = registry.GOHM;
        return { token: tokenAddress, oracle: oracle.address };
    });

export default configGohmPP;
configGohmPP.id = CONFIG_GOHM_ORACLE;
configGohmPP.tags = ["oracle", CONFIG_GOHM_ORACLE];
configGohmPP.dependencies = [GOHM_ORACLE_DID, PRICE_PROVIDER_DID];
