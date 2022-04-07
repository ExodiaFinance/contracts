"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WFTM_BOND_DID = void 0;
const contracts_1 = require("../packages/sdk/contracts");
const utils_1 = require("../packages/utils/utils");
const _01_deployOhm_1 = require("./01_deployOhm");
const _03_deployTreasury_1 = require("./03_deployTreasury");
const _07_deployStakingHelper_1 = require("./07_deployStakingHelper");
const _10_deployRedeemHelper_1 = require("./10_deployRedeemHelper");
exports.WFTM_BOND_DID = "wftm_bond";
const deployWFTMBond = async ({ deploy, get, getNamedAccounts, getNetwork }) => {
    const { contract: ohm } = await get("OlympusERC20Token");
    const { contract: treasury } = await get("OlympusTreasury");
    const { DAO, deployer } = await getNamedAccounts();
    const { WFTM, FTM_USD_FEED } = contracts_1.externalAddressRegistry.forNetwork(
        await getNetwork()
    );
    const { contract: bond, deployment } = await deploy("wFTMBondDepository", [
        ohm.address,
        WFTM,
        treasury.address,
        DAO,
        FTM_USD_FEED,
    ]);
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        const { contract: staking } = await get("StakingHelperV2");
        await bond.setStaking(staking.address, true);
        const { contract: redeemHelper } = await get("RedeemHelper");
        if ((await redeemHelper.policy()) === deployer) {
            await redeemHelper.addBondContract(bond.address);
        }
    }
    (0, utils_1.log)("wFTM Bond ", bond.address);
};
exports.default = deployWFTMBond;
deployWFTMBond.id = exports.WFTM_BOND_DID;
deployWFTMBond.tags = ["local", "test", exports.WFTM_BOND_DID];
deployWFTMBond.dependencies = (0, utils_1.ifNotProd)([
    _03_deployTreasury_1.TREASURY_DID,
    _01_deployOhm_1.OHM_DID,
    _10_deployRedeemHelper_1.REDEEM_HELPER_DID,
    _07_deployStakingHelper_1.STAKING_HELPER_DID,
]);
