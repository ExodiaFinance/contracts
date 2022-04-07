"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BONDING_CALCULATOR_DID = void 0;
const utils_1 = require("../packages/utils/utils");
const _01_deployOhm_1 = require("./01_deployOhm");
exports.BONDING_CALCULATOR_DID = "bonding_calculator";
const deployStakingHelper = async ({ deploy, get }) => {
    const { contract: ohm } = await get("OlympusERC20Token");
    const { contract } = await deploy("OlympusBondingCalculator", [ohm.address]);
    const { contract: treasury } = await get("OlympusTreasury");
    (0, utils_1.log)("Bonding Calculator:", contract.address);
};
exports.default = deployStakingHelper;
deployStakingHelper.id = exports.BONDING_CALCULATOR_DID;
deployStakingHelper.tags = ["local", "test", exports.BONDING_CALCULATOR_DID];
deployStakingHelper.dependencies = [_01_deployOhm_1.OHM_DID];
