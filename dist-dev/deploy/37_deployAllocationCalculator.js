"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOCATION_CALCULATOR_DID = void 0;
const utils_1 = require("../packages/utils/utils");
const _38_deployExodiaRoles_1 = require("./38_deployExodiaRoles");
exports.ALLOCATION_CALCULATOR_DID = "allocation_calculator";
const deployAllocationCalculator = async ({ deploy, get }) => {
    const { contract: allocCalc, deployment } = await deploy("AllocationCalculator", []);
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        const { contract: roles } = await get("ExodiaRoles");
        await (0, utils_1.exec)(() => allocCalc.initialize(roles.address));
    }
    (0, utils_1.log)("Allocation Calculator", allocCalc.address);
};
exports.default = deployAllocationCalculator;
deployAllocationCalculator.id = exports.ALLOCATION_CALCULATOR_DID;
deployAllocationCalculator.tags = ["local", "test", exports.ALLOCATION_CALCULATOR_DID];
deployAllocationCalculator.dependencies = [_38_deployExodiaRoles_1.EXODIA_ROLES_DID];
