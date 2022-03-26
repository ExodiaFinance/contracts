import { configChainlinkOracle } from "./configOracles";

export const CONFIG_DAI_ORACLE = "pp_config_dai";

const configUSDCPP = configChainlinkOracle(
    "DAI",
    "0x91d5DEFAFfE2854C7D02F50c80FA1fdc8A721e52"
);

export default configUSDCPP;
configUSDCPP.id = CONFIG_DAI_ORACLE;
configUSDCPP.tags = ["oracle", CONFIG_DAI_ORACLE];
