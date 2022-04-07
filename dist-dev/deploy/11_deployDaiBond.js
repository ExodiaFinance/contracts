"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAI_BOND_DID = void 0;
const utils_1 = require("../packages/utils/utils");
const _00_deployDai_1 = require("./00_deployDai");
const _01_deployOhm_1 = require("./01_deployOhm");
const _03_deployTreasury_1 = require("./03_deployTreasury");
const _10_deployRedeemHelper_1 = require("./10_deployRedeemHelper");
exports.DAI_BOND_DID = "dai_bond";
const deployDaiBond = async ({ deploy, get, getNamedAccounts }) => {
    const { contract: ohm } = await get("OlympusERC20Token");
    const { contract: dai } = await get("DAI");
    const { contract: treasury } = await get("OlympusTreasury");
    const { DAO } = await getNamedAccounts();
    const { contract: bond, deployment } = await deploy("DAIBondDepository", [
        ohm.address,
        dai.address,
        treasury.address,
        DAO,
        utils_1.ZERO_ADDRESS,
    ]);
    await bond.initializeBondTerms(100, 1000, 0, 100000000, 0, "10000000000000000", 0);
    /*    if (deployment?.newlyDeployed) {
        const { contract: redeemHelper } = await get<RedeemHelper__factory>(
            "RedeemHelper"
        );
        await redeemHelper.addBondContract(bond.address);
    }*/
    (0, utils_1.log)("DAI Bond ", bond.address);
};
exports.default = deployDaiBond;
deployDaiBond.id = exports.DAI_BOND_DID;
deployDaiBond.tags = ["local", "test", exports.DAI_BOND_DID];
deployDaiBond.dependencies = [
    _00_deployDai_1.DAI_DID,
    _03_deployTreasury_1.TREASURY_DID,
    _01_deployOhm_1.OHM_DID,
    _10_deployRedeemHelper_1.REDEEM_HELPER_DID,
];
