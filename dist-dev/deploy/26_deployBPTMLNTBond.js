"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BPTMNLT_BOND_DID = void 0;
const contracts_1 = require("../packages/sdk/contracts");
const utils_1 = require("../packages/utils/utils");
const _01_deployOhm_1 = require("./01_deployOhm");
const _03_deployTreasury_1 = require("./03_deployTreasury");
const _10_deployRedeemHelper_1 = require("./10_deployRedeemHelper");
const _25_deployBPTMNLTpriceOracle_1 = require("./25_deployBPTMNLTpriceOracle");
exports.BPTMNLT_BOND_DID = "bptmnlt_bond";
const deployDaiBond = async ({ deploy, get, getNamedAccounts, getNetwork }) => {
    const { contract: ohm } = await get("OlympusERC20Token");
    const { contract: treasury } = await get("OlympusTreasury");
    const { DAO, deployer } = await getNamedAccounts();
    const { contract: feed } = await get("BPTMNLTPriceOracle");
    const { THE_MONOLITH_POOL } = contracts_1.externalAddressRegistry.forNetwork(
        await getNetwork()
    );
    const { contract: bond, deployment } = await deploy("BPTMNLTBondDepository", [
        ohm.address,
        THE_MONOLITH_POOL,
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
    (0, utils_1.log)("BPTMNLT Bond ", bond.address);
};
exports.default = deployDaiBond;
deployDaiBond.id = exports.BPTMNLT_BOND_DID;
deployDaiBond.tags = ["local", "test", exports.BPTMNLT_BOND_DID];
deployDaiBond.dependencies = [
    ...(0, utils_1.ifNotProd)([
        _03_deployTreasury_1.TREASURY_DID,
        _01_deployOhm_1.OHM_DID,
        _10_deployRedeemHelper_1.REDEEM_HELPER_DID,
        _25_deployBPTMNLTpriceOracle_1.BPTMNLT_ORACLE_DID,
    ]),
];
