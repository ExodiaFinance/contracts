"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG_DAI_ORACLE = void 0;
const configOracles_1 = require("./configOracles");
exports.CONFIG_DAI_ORACLE = "pp_config_dai";
const configUSDCPP = (0, configOracles_1.configChainlinkOracle)(
    "DAI",
    "0x91d5DEFAFfE2854C7D02F50c80FA1fdc8A721e52"
);
exports.default = configUSDCPP;
configUSDCPP.id = exports.CONFIG_DAI_ORACLE;
configUSDCPP.tags = ["oracle", exports.CONFIG_DAI_ORACLE];
