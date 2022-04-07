"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOLIDLY_TWAP_ORACLE_DID = void 0;
const sdk_1 = require("../packages/sdk");
const utils_1 = require("../packages/utils/utils");
const _38_deployExodiaRoles_1 = require("./38_deployExodiaRoles");
const _44_deployPriceProvider_1 = require("./44_deployPriceProvider");
exports.SOLIDLY_TWAP_ORACLE_DID = "solidly_oracle";
const deployStrategyWhitelist = async ({ deploy, get, getNetwork }) => {
    const { contract: oracle, deployment } = await deploy("SolidlyTWAPOracle", []);
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        const { contract: roles } = await get("ExodiaRoles");
        const { contract: pp } = await get("PriceProvider");
        const { WFTM } = sdk_1.externalAddressRegistry.forNetwork(await getNetwork());
        await (0, utils_1.exec)(() => oracle.initialize(WFTM, pp.address, roles.address));
    }
    (0, utils_1.log)("Solidly TWAP oracle", oracle.address);
};
exports.default = deployStrategyWhitelist;
deployStrategyWhitelist.id = exports.SOLIDLY_TWAP_ORACLE_DID;
deployStrategyWhitelist.tags = ["local", "test", exports.SOLIDLY_TWAP_ORACLE_DID];
deployStrategyWhitelist.dependencies = (0, utils_1.ifNotProd)([
    _38_deployExodiaRoles_1.EXODIA_ROLES_DID,
    _44_deployPriceProvider_1.PRICE_PROVIDER_DID,
]);
