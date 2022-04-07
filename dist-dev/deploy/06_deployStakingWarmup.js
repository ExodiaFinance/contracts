"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WARMUP_STAKING_DID = void 0;
const utils_1 = require("../packages/utils/utils");
const _02_deploysOhm_1 = require("./02_deploysOhm");
const _05_deployStaking_1 = require("./05_deployStaking");
exports.WARMUP_STAKING_DID = "staking_warmup";
const deployStakingWarmup = async ({ deploy, get }) => {
    const { contract: sohm } = await get("sOlympus");
    const { contract: staking } = await get("OlympusStaking");
    const { contract: warmup, deployment } = await deploy("StakingWarmup", [
        staking.address,
        sohm.address,
    ]);
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        await staking.setContract(1, warmup.address);
    }
    (0, utils_1.log)("StakingWarmup:", warmup.address);
};
exports.default = deployStakingWarmup;
deployStakingWarmup.id = exports.WARMUP_STAKING_DID;
deployStakingWarmup.tags = [
    "local",
    "test",
    exports.WARMUP_STAKING_DID,
    _05_deployStaking_1.STAKING_DID,
];
deployStakingWarmup.dependencies = [_02_deploysOhm_1.SOHM_DID];
deployStakingWarmup.runAtTheEnd = true;
