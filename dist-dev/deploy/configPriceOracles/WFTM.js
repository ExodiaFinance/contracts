"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG_WFTM_ORACLE = void 0;
const configOracles_1 = require("./configOracles");
exports.CONFIG_WFTM_ORACLE = "pp_config_wftm";
const configWFTMPP = (0, configOracles_1.configChainlinkOracle)(
    "WFTM",
    "0xf4766552D15AE4d256Ad41B6cf2933482B0680dc"
);
exports.default = configWFTMPP;
configWFTMPP.id = exports.CONFIG_WFTM_ORACLE;
configWFTMPP.tags = ["oracle", exports.CONFIG_WFTM_ORACLE];
