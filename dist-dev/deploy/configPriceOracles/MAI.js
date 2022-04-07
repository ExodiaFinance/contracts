"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG_MAI_ORACLE = void 0;
const configOracles_1 = require("./configOracles");
exports.CONFIG_MAI_ORACLE = "pp_config_mai";
const configUSDCPP = (0, configOracles_1.configChainlinkOracle)(
    "MAI",
    "0x827863222c9C603960dE6FF2c0dD58D457Dcc363"
);
exports.default = configUSDCPP;
configUSDCPP.id = exports.CONFIG_MAI_ORACLE;
configUSDCPP.tags = ["oracle", exports.CONFIG_MAI_ORACLE];
