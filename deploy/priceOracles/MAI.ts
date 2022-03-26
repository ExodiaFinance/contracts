import { configChainlinkOracle } from "./configOracles";

export const CONFIG_MAI_ORACLE = "pp_config_mai";

const configUSDCPP = configChainlinkOracle(
    "MAI",
    "0x827863222c9C603960dE6FF2c0dD58D457Dcc363"
);

export default configUSDCPP;
configUSDCPP.id = CONFIG_MAI_ORACLE;
configUSDCPP.tags = ["oracle", CONFIG_MAI_ORACLE];
