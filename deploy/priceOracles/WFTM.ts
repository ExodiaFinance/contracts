import { configChainlinkOracle } from "./configOracles";

export const CONFIG_WFTM_ORACLE = "pp_config_wftm";

const configWFTMPP = configChainlinkOracle(
    "WFTM",
    "0xf4766552D15AE4d256Ad41B6cf2933482B0680dc"
);

export default configWFTMPP;
configWFTMPP.id = CONFIG_WFTM_ORACLE;
configWFTMPP.tags = ["oracle", CONFIG_WFTM_ORACLE];
