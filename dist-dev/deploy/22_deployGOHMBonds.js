"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GOHM_BOND_DID = void 0;
const utils_1 = require("../packages/utils/utils");
const _01_deployOhm_1 = require("./01_deployOhm");
const _03_deployTreasury_1 = require("./03_deployTreasury");
const _10_deployRedeemHelper_1 = require("./10_deployRedeemHelper");
const _21_deployGOHMPriceOracle_1 = require("./21_deployGOHMPriceOracle");
exports.GOHM_BOND_DID = "gohm_bond";
const deployDaiBond = async ({ deploy, get, getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts();
    const { contract: ohm } = await get("OlympusERC20Token");
    const { contract: treasury } = await get("OlympusTreasury");
    const { DAO } = await getNamedAccounts();
    const { contract: feed } = await get("GOHMPriceOracle");
    const { contract: bond, deployment } = await deploy("GOHMBondDepository", [
        ohm.address,
        _21_deployGOHMPriceOracle_1.GOHM_ADDRESS,
        treasury.address,
        DAO,
        feed.address,
    ]);
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        const { contract: redeemHelper } = await get("RedeemHelper");
        if ((await redeemHelper.policy()) === deployer) {
            await redeemHelper.addBondContract(bond.address);
        }
    }
    (0, utils_1.log)("gOHM Bond ", bond.address);
};
exports.default = deployDaiBond;
deployDaiBond.id = exports.GOHM_BOND_DID;
deployDaiBond.tags = ["local", "test", exports.GOHM_BOND_DID];
deployDaiBond.dependencies = (0, utils_1.ifNotProd)([
    _03_deployTreasury_1.TREASURY_DID,
    _01_deployOhm_1.OHM_DID,
    _10_deployRedeemHelper_1.REDEEM_HELPER_DID,
    _21_deployGOHMPriceOracle_1.GOHM_ORACLE_DID,
]);
