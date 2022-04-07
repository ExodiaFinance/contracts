"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG_DEI_ORACLE = void 0;
const configOracles_1 = require("./configOracles");
exports.CONFIG_DEI_ORACLE = "pp_config_dei";
const configDeiPP = (0, configOracles_1.configSolidlyOracle)(
    "DEI",
    "0x5821573d8F04947952e76d94f3ABC6d7b43bF8d0"
);
exports.default = configDeiPP;
configDeiPP.id = exports.CONFIG_DEI_ORACLE;
configDeiPP.tags = ["oracle", exports.CONFIG_DEI_ORACLE];
