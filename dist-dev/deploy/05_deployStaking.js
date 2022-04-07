"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAKING_EPOCH_LENGTH = exports.STAKING_DID = void 0;
const utils_1 = require("../packages/utils/utils");
const _01_deployOhm_1 = require("./01_deployOhm");
const _02_deploysOhm_1 = require("./02_deploysOhm");
exports.STAKING_DID = "staking";
exports.STAKING_EPOCH_LENGTH = 28800;
const deployStaking = async ({ deploy, get, ethers }) => {
    const { contract: ohm } = await get("OlympusERC20Token");
    const { contract: sohm } = await get("sOlympus");
    const { contract: staking, deployment } = await deploy("OlympusStaking", [
        ohm.address,
        sohm.address,
        exports.STAKING_EPOCH_LENGTH,
        0,
        0,
    ]);
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        await sohm.initialize(staking.address);
    }
    (0, utils_1.log)("Staking:", staking.address);
};
exports.default = deployStaking;
deployStaking.id = exports.STAKING_DID;
deployStaking.tags = ["local", "test", exports.STAKING_DID];
deployStaking.dependencies = [_02_deploysOhm_1.SOHM_DID, _01_deployOhm_1.OHM_DID];
