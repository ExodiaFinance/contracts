import { configChainlinkOracle } from "./configOracles";

export const CONFIG_WFTM_ORACLE = "pp_config_wftm";

const configUSDCPP = configChainlinkOracle(
    "WFTM",
    "0xf4766552D15AE4d256Ad41B6cf2933482B0680dc"
);

export default configUSDCPP;
configUSDCPP.id = CONFIG_WFTM_ORACLE;
configUSDCPP.tags = ["oracle", CONFIG_WFTM_ORACLE];
