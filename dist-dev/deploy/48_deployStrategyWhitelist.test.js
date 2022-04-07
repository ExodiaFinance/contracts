"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STRATEGY_WHITELIST_DID = void 0;
const utils_1 = require("../packages/utils/utils");
const _38_deployExodiaRoles_1 = require("./38_deployExodiaRoles");
exports.STRATEGY_WHITELIST_DID = "strategy_whitelist";
const deployStrategyWhitelist = async ({ deploy, get, getNetwork }) => {
    const { contract: wl, deployment } = await deploy("StrategyWhitelist", []);
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        const { contract: roles } = await get("ExodiaRoles");
        await (0, utils_1.exec)(() => wl.initialize(roles.address));
    }
    (0, utils_1.log)("Strategy Whitelist", wl.address);
};
exports.default = deployStrategyWhitelist;
deployStrategyWhitelist.id = exports.STRATEGY_WHITELIST_DID;
deployStrategyWhitelist.tags = ["local", "test", exports.STRATEGY_WHITELIST_DID];
deployStrategyWhitelist.dependencies = [_38_deployExodiaRoles_1.EXODIA_ROLES_DID];
