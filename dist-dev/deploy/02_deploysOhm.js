"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOHM_DID = void 0;
const utils_1 = require("../packages/utils/utils");
exports.SOHM_DID = "sohm_token";
const sohmDeployment = async ({ deploy }) => {
    const { contract, deployment } = await deploy("sOlympus", []);
    (0, utils_1.log)("sOHM ", contract.address);
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        await contract.setIndex((0, utils_1.toWei)(1, utils_1.OHM_DECIMALS));
    }
};
exports.default = sohmDeployment;
sohmDeployment.id = exports.SOHM_DID;
sohmDeployment.tags = ["local", "test", exports.SOHM_DID];
