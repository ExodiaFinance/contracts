"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHAINLINK_PRICE_ORACLE_DID = void 0;
const utils_1 = require("../packages/utils/utils");
exports.CHAINLINK_PRICE_ORACLE_DID = "chainlink_price_oracle";
const deployChainlinkPriceOracle = async ({ deploy, getNetwork }) => {
    const { contract: chainlinkPriceOracle } = await deploy("ChainlinkPriceOracle", []);
    (0, utils_1.log)("chainlink price oracle", chainlinkPriceOracle.address);
};
exports.default = deployChainlinkPriceOracle;
deployChainlinkPriceOracle.id = exports.CHAINLINK_PRICE_ORACLE_DID;
deployChainlinkPriceOracle.tags = ["local", "test", exports.CHAINLINK_PRICE_ORACLE_DID];
