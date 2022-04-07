"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG_USDC_ORACLE = void 0;
const configOracles_1 = require("./configOracles");
exports.CONFIG_USDC_ORACLE = "pp_config_usdc";
const configUSDCPP = (0, configOracles_1.configChainlinkOracle)(
    "USDC",
    "0x2553f4eeb82d5A26427b8d1106C51499CBa5D99c"
);
exports.default = configUSDCPP;
configUSDCPP.id = exports.CONFIG_USDC_ORACLE;
configUSDCPP.tags = ["oracle", exports.CONFIG_USDC_ORACLE];
