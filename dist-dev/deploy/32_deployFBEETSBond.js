"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FBEETS_BOND_DID = void 0;
const contracts_1 = require("../packages/sdk/contracts");
const utils_1 = require("../packages/utils/utils");
const _01_deployOhm_1 = require("./01_deployOhm");
const _03_deployTreasury_1 = require("./03_deployTreasury");
const _10_deployRedeemHelper_1 = require("./10_deployRedeemHelper");
const _29_deployFBEETSOracle_1 = require("./29_deployFBEETSOracle");
exports.FBEETS_BOND_DID = "fbeets_bond";
const deployFBEETSbond = async ({ deploy, get, getNamedAccounts, getNetwork }) => {
    const { contract: ohm } = await get("OlympusERC20Token");
    const { contract: treasury } = await get("OlympusTreasury");
    const { DAO, deployer } = await getNamedAccounts();
    const { contract: feed } = await get("fBEETSPriceOracle");
    const { FBEETS_BAR } = contracts_1.externalAddressRegistry.forNetwork(
        await getNetwork()
    );
    const { contract: bond, deployment } = await deploy("fBEETSBondDepository", [
        ohm.address,
        FBEETS_BAR,
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
    (0, utils_1.log)("fBEETS Bond ", bond.address);
};
exports.default = deployFBEETSbond;
deployFBEETSbond.id = exports.FBEETS_BOND_DID;
deployFBEETSbond.tags = ["local", "test", exports.FBEETS_BOND_DID];
deployFBEETSbond.dependencies = (0, utils_1.ifNotProd)([
    _03_deployTreasury_1.TREASURY_DID,
    _01_deployOhm_1.OHM_DID,
    _10_deployRedeemHelper_1.REDEEM_HELPER_DID,
    _29_deployFBEETSOracle_1.FBEETS_ORACLE_DID,
]);
