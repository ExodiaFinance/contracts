"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WOHM_DID = void 0;
const utils_1 = require("../packages/utils/utils");
const _01_deployOhm_1 = require("./01_deployOhm");
const _02_deploysOhm_1 = require("./02_deploysOhm");
const _05_deployStaking_1 = require("./05_deployStaking");
exports.WOHM_DID = "wohm_token";
const deployWOHM = async ({ deploy, get }) => {
    const { contract: ohm } = await get("OlympusERC20Token");
    const { contract: sohm } = await get("sOlympus");
    const { contract: staking } = await get("OlympusStaking");
    const { contract: wohm } = await deploy("wOHM", [
        staking.address,
        ohm.address,
        sohm.address,
    ]);
    (0, utils_1.log)("wOHM:", wohm.address);
};
exports.default = deployWOHM;
deployWOHM.id = exports.WOHM_DID;
deployWOHM.tags = ["local", "test", exports.WOHM_DID];
deployWOHM.dependencies = (0, utils_1.ifNotProd)([
    _05_deployStaking_1.STAKING_DID,
    _02_deploysOhm_1.SOHM_DID,
    _01_deployOhm_1.OHM_DID,
]);
