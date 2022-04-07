"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PNLTRACKER_DID = void 0;
const utils_1 = require("../packages/utils/utils");
const _38_deployExodiaRoles_1 = require("./38_deployExodiaRoles");
exports.PNLTRACKER_DID = "pnl_tracker";
const deployPnlTracker = async ({ deploy, get, getNetwork }) => {
    const { contract: pnlTracker, deployment } = await deploy("PNLTracker", []);
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        const { contract: roles } = await get("ExodiaRoles");
        await (0, utils_1.exec)(() => pnlTracker.initialize(roles.address));
    }
    (0, utils_1.log)("PNL tracker", pnlTracker.address);
};
exports.default = deployPnlTracker;
deployPnlTracker.id = exports.PNLTRACKER_DID;
deployPnlTracker.tags = ["local", "test", exports.PNLTRACKER_DID];
deployPnlTracker.dependencies = [_38_deployExodiaRoles_1.EXODIA_ROLES_DID];
