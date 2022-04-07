"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHAINLINK_PRICE_ORACLE_INITIALIZE_DID = void 0;
const contracts_1 = require("../packages/sdk/contracts");
const utils_1 = require("../packages/utils/utils");
const _38_deployExodiaRoles_1 = require("./38_deployExodiaRoles");
const _43_deployChainlinkPriceOracle_1 = require("./43_deployChainlinkPriceOracle");
exports.CHAINLINK_PRICE_ORACLE_INITIALIZE_DID = "chainlink_price_oracle_init";
const initializeChainlinkPriceOracle = async ({ deploy, get, getNetwork }) => {
    const { contract: chainlinkPriceOracle, deployment } = await get(
        "ChainlinkPriceOracle"
    );
    const { contract: exodiaRoles } = await get("ExodiaRoles");
    const { WFTM, FTM_USD_FEED, MAI } = contracts_1.externalAddressRegistry.forNetwork(
        await getNetwork()
    );
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        await (0, utils_1.exec)(() =>
            chainlinkPriceOracle.initialize(exodiaRoles.address, FTM_USD_FEED)
        );
    }
    (0, utils_1.log)("Chainlink oracle initialized", chainlinkPriceOracle.address);
};
exports.default = initializeChainlinkPriceOracle;
initializeChainlinkPriceOracle.id = exports.CHAINLINK_PRICE_ORACLE_INITIALIZE_DID;
initializeChainlinkPriceOracle.tags = [
    "local",
    "test",
    exports.CHAINLINK_PRICE_ORACLE_INITIALIZE_DID,
];
initializeChainlinkPriceOracle.dependencies = (0, utils_1.ifNotProd)([
    _43_deployChainlinkPriceOracle_1.CHAINLINK_PRICE_ORACLE_DID,
    _38_deployExodiaRoles_1.EXODIA_ROLES_DID,
]);
