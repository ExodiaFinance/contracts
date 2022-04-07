"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXODIA_ROLES_DID = void 0;
const utils_1 = require("../packages/utils/utils");
exports.EXODIA_ROLES_DID = "exodia_roles";
const deployExodiaRoles = async ({ deploy, getNamedAccounts }) => {
    const { deployer, DAO } = await getNamedAccounts();
    const { contract: roles, deployment } = await deploy("ExodiaRoles", [deployer]);
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        await (0, utils_1.exec)(() => roles.addArchitect(deployer));
    }
    (0, utils_1.log)("Exodia roles: ", roles.address);
};
exports.default = deployExodiaRoles;
deployExodiaRoles.id = exports.EXODIA_ROLES_DID;
deployExodiaRoles.tags = ["local", "test", exports.EXODIA_ROLES_DID];
deployExodiaRoles.dependencies = [];
