"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configChainlinkOracle =
    exports.configSolidlyOracle =
    exports.configTokenOracleFactory =
        void 0;
const contracts_1 = require("../../packages/sdk/contracts");
const utils_1 = require("../../packages/utils/utils");
const _43_deployChainlinkPriceOracle_1 = require("../43_deployChainlinkPriceOracle");
const _49_initializePriceProvider_1 = require("../49_initializePriceProvider");
const _50_deploySolidlyTwapOracle_1 = require("../50_deploySolidlyTwapOracle");
const configTokenOracleFactory = (oracleConfig) => {
    return (xhre) => configTokenOracle(xhre, oracleConfig);
};
exports.configTokenOracleFactory = configTokenOracleFactory;
const configTokenOracle = async (xhre, configOracle) => {
    const { contract: pp } = await xhre.get("PriceProvider");
    const registry = contracts_1.externalAddressRegistry.forNetwork(
        await xhre.getNetwork()
    );
    const config = await configOracle(xhre, registry);
    await (0, utils_1.exec)(() => pp.setTokenOracle(config.token, config.oracle));
};
const configSolidlyOracle = (token, lp) => {
    const config = (0, exports.configTokenOracleFactory)(async (xhre, registry) => {
        const { contract: oracle } = await xhre.get("SolidlyTWAPOracle");
        const tokenAddress = registry[token];
        await (0, utils_1.exec)(() => oracle.setPair(tokenAddress, lp));
        return { token: tokenAddress, oracle: oracle.address };
    });
    config.dependencies = [
        _49_initializePriceProvider_1.PRICE_PROVIDER_INIT_DID,
        _50_deploySolidlyTwapOracle_1.SOLIDLY_TWAP_ORACLE_DID,
    ];
    return config;
};
exports.configSolidlyOracle = configSolidlyOracle;
const configChainlinkOracle = (token, feed) => {
    const config = (0, exports.configTokenOracleFactory)(async (xhre, registry) => {
        const { contract: oracle } = await xhre.get("ChainlinkPriceOracle");
        const tokenAddress = registry[token];
        await (0, utils_1.exec)(() => oracle.setPriceFeed(tokenAddress, feed));
        return { token: tokenAddress, oracle: oracle.address };
    });
    config.dependencies = [
        _49_initializePriceProvider_1.PRICE_PROVIDER_INIT_DID,
        _43_deployChainlinkPriceOracle_1.CHAINLINK_PRICE_ORACLE_DID,
    ];
    return config;
};
exports.configChainlinkOracle = configChainlinkOracle;
