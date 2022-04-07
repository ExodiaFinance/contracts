"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TREASURY_DID = void 0;
const utils_1 = require("../packages/utils/utils");
const _00_deployDai_1 = require("./00_deployDai");
const _01_deployOhm_1 = require("./01_deployOhm");
exports.TREASURY_DID = "treasury";
const treasuryDeployment = async ({ deploy, get }) => {
    const { contract: dai } = await get("DAI");
    const { contract: ohm } = await get("OlympusERC20Token");
    const { contract, deployment } = await deploy("OlympusTreasury", [
        ohm.address,
        dai.address,
        0,
    ]);
    (0, utils_1.log)("Treasury", contract.address);
};
exports.default = treasuryDeployment;
treasuryDeployment.id = exports.TREASURY_DID;
treasuryDeployment.tags = ["local", "test", exports.TREASURY_DID];
treasuryDeployment.dependencies = [_01_deployOhm_1.OHM_DID, _00_deployDai_1.DAI_DID];
