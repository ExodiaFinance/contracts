"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OHM_SET_VAULT_DID = void 0;
const utils_1 = require("../packages/utils/utils");
const _01_deployOhm_1 = require("./01_deployOhm");
const _03_deployTreasury_1 = require("./03_deployTreasury");
exports.OHM_SET_VAULT_DID = "ohm_set_vault";
const ohmSetVault = async ({ get }) => {
    const { contract: ohm } = await get("OlympusERC20Token");
    const { contract: treasury } = await get("OlympusTreasury");
    const ohmVault = await ohm.vault();
    if (ohmVault !== treasury.address) {
        await ohm.setVault(treasury.address);
        (0, utils_1.log)("Updated OHM vault", ohmVault, "->", treasury.address);
    }
};
exports.default = ohmSetVault;
ohmSetVault.id = exports.OHM_SET_VAULT_DID;
ohmSetVault.tags = ["local", "test", _03_deployTreasury_1.TREASURY_DID];
ohmSetVault.dependencies = [_01_deployOhm_1.OHM_DID, exports.OHM_SET_VAULT_DID];
