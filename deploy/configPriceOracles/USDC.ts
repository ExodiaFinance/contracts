import { configChainlinkOracle } from "./configOracles";

export const CONFIG_USDC_ORACLE = "pp_config_usdc";

const configUSDCPP = configChainlinkOracle(
    "USDC",
    "0x2553f4eeb82d5A26427b8d1106C51499CBa5D99c"
);

export default configUSDCPP;
configUSDCPP.id = CONFIG_USDC_ORACLE;
configUSDCPP.tags = ["oracle", CONFIG_USDC_ORACLE];
