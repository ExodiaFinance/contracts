"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BALANCER_V2_PRICE_ORACLE_INIT_DID = void 0;
const contracts_1 = require("../packages/sdk/contracts");
const utils_1 = require("../packages/utils/utils");
const _38_deployExodiaRoles_1 = require("./38_deployExodiaRoles");
const _42_deployBalancerV2PriceOracle_1 = require("./42_deployBalancerV2PriceOracle");
exports.BALANCER_V2_PRICE_ORACLE_INIT_DID = "balancer_v2_price_oracle_init";
const deployBalancerV2PriceOracle = async ({ deploy, get, getNetwork }) => {
    const { contract: balancerV2PriceOracle, deployment } = await get(
        "BalancerV2PriceOracle"
    );
    const { contract: exodiaRoles } = await get("ExodiaRoles");
    const { BEETHOVEN_VAULT } = contracts_1.externalAddressRegistry.forNetwork(
        await getNetwork()
    );
    await balancerV2PriceOracle.initialize(exodiaRoles.address, BEETHOVEN_VAULT, 1800);
    (0, utils_1.log)(
        "balancer v2 price oracle initialized",
        balancerV2PriceOracle.address
    );
};
exports.default = deployBalancerV2PriceOracle;
deployBalancerV2PriceOracle.id = exports.BALANCER_V2_PRICE_ORACLE_INIT_DID;
deployBalancerV2PriceOracle.tags = [
    "local",
    "test",
    exports.BALANCER_V2_PRICE_ORACLE_INIT_DID,
];
deployBalancerV2PriceOracle.dependencies = (0, utils_1.ifNotProd)([
    _42_deployBalancerV2PriceOracle_1.BALANCER_V2_PRICE_ORACLE_DID,
    _38_deployExodiaRoles_1.EXODIA_ROLES_DID,
]);
