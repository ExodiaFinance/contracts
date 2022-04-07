"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MINT_DAI_DID = void 0;
const utils_1 = require("../packages/utils/utils");
const _00_deployDai_1 = require("./00_deployDai");
exports.MINT_DAI_DID = "mint_dai_token";
const mintDai = async ({ get, getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts();
    const { contract: dai } = await get("DAI");
    await dai.mint(deployer, (0, utils_1.toWei)(100, utils_1.DAI_DECIMALS));
};
exports.default = mintDai;
mintDai.id = exports.MINT_DAI_DID;
mintDai.tags = ["local", "test", exports.MINT_DAI_DID];
mintDai.dependencies = [_00_deployDai_1.DAI_DID];
