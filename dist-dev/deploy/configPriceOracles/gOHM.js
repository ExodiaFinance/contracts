"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG_GOHM_ORACLE = void 0;
const _21_deployGOHMPriceOracle_1 = require("../21_deployGOHMPriceOracle");
const _44_deployPriceProvider_1 = require("../44_deployPriceProvider");
const configOracles_1 = require("./configOracles");
exports.CONFIG_GOHM_ORACLE = "pp_config_gohm";
const configGohmPP = (0, configOracles_1.configTokenOracleFactory)(
    async (xhre, registry) => {
        const { contract: oracle } = await xhre.get("GOHMPriceOracle");
        const tokenAddress = registry.GOHM;
        return { token: tokenAddress, oracle: oracle.address };
    }
);
exports.default = configGohmPP;
configGohmPP.id = exports.CONFIG_GOHM_ORACLE;
configGohmPP.tags = ["oracle", exports.CONFIG_GOHM_ORACLE];
configGohmPP.dependencies = [
    _21_deployGOHMPriceOracle_1.GOHM_ORACLE_DID,
    _44_deployPriceProvider_1.PRICE_PROVIDER_DID,
];
