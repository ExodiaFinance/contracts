"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BALANCER_V2_PRICE_ORACLE_DID = void 0;
const utils_1 = require("../packages/utils/utils");
exports.BALANCER_V2_PRICE_ORACLE_DID = "balancer_v2_price_oracle";
const deployBalancerV2PriceOracle = async ({ deploy, getNetwork }) => {
    const { contract: balancerV2PriceOracle, deployment } = await deploy(
        "BalancerV2PriceOracle",
        []
    );
    (0, utils_1.log)("balancer v2 price oracle", balancerV2PriceOracle.address);
};
exports.default = deployBalancerV2PriceOracle;
deployBalancerV2PriceOracle.id = exports.BALANCER_V2_PRICE_ORACLE_DID;
deployBalancerV2PriceOracle.tags = [
    "local",
    "test",
    exports.BALANCER_V2_PRICE_ORACLE_DID,
];
