"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEN_ABSORPTION_BOND = void 0;
const utils_1 = require("../packages/utils/utils");
const _17_deployWOHM_1 = require("./17_deployWOHM");
exports.WEN_ABSORPTION_BOND = "wen_absorption_bond";
const deployWenAbsorptionBond = async ({ deploy, get, getNamedAccounts }) => {
    const { contract: wsexod } = await get("wOHM");
    const { contract: arfv } = await get("AllocatedRiskFreeValue");
    const { DAO } = await getNamedAccounts();
    const WEN = "0x86D7BcCB91B1c5A01A7aD7D7D0eFC7106928c7F8";
    const { contract: bond } = await deploy("WenAbsorptionBondDepository", [
        wsexod.address,
        WEN,
        DAO,
    ]);
    (0, utils_1.log)("WEN absorption bond", bond.address);
};
exports.default = deployWenAbsorptionBond;
deployWenAbsorptionBond.id = exports.WEN_ABSORPTION_BOND;
deployWenAbsorptionBond.tags = ["local", "test", exports.WEN_ABSORPTION_BOND];
deployWenAbsorptionBond.dependencies = (0, utils_1.ifNotProd)([
    _17_deployWOHM_1.WOHM_DID,
]);
