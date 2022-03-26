import { configSolidlyOracle } from "./configOracles";

export const CONFIG_DEI_ORACLE = "pp_config_dei";

const configDeiPP = configSolidlyOracle(
    "DEI",
    "0x5821573d8F04947952e76d94f3ABC6d7b43bF8d0"
);

export default configDeiPP;
configDeiPP.id = CONFIG_DEI_ORACLE;
configDeiPP.tags = ["oracle", CONFIG_DEI_ORACLE];
