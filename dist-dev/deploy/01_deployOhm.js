"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OHM_DID = void 0;
const utils_1 = require("../packages/utils/utils");
exports.OHM_DID = "ohm_token";
const ohmDeployment = async ({ deploy }) => {
    const { contract } = await deploy("OlympusERC20Token", []);
    (0, utils_1.log)("OHM ", contract.address);
};
exports.default = ohmDeployment;
ohmDeployment.id = exports.OHM_DID;
ohmDeployment.tags = ["local", "test", exports.OHM_DID];
