"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAKING_HELPER_DID = void 0;
const utils_1 = require("../packages/utils/utils");
const _01_deployOhm_1 = require("./01_deployOhm");
const _05_deployStaking_1 = require("./05_deployStaking");
exports.STAKING_HELPER_DID = "staking_helper";
const deployStakingHelper = async ({ deploy, get }) => {
    const { contract: ohm } = await get("OlympusERC20Token");
    const { contract: staking } = await get("OlympusStaking");
    const { contract } = await deploy("StakingHelperV2", [staking.address, ohm.address]);
    (0, utils_1.log)("StakingHelper:", contract.address);
};
exports.default = deployStakingHelper;
deployStakingHelper.id = exports.STAKING_HELPER_DID;
deployStakingHelper.tags = [
    "local",
    "test",
    exports.STAKING_HELPER_DID,
    _05_deployStaking_1.STAKING_DID,
];
deployStakingHelper.dependencies = [_01_deployOhm_1.OHM_DID];
// deployStakingHelper.runAtTheEnd = true;
