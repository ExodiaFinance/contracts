"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REDEEM_HELPER_DID = void 0;
const utils_1 = require("../packages/utils/utils");
exports.REDEEM_HELPER_DID = "redeem_helper";
const deployRedeemHelper = async ({ deploy }) => {
    const { contract } = await deploy("RedeemHelper", []);
    (0, utils_1.log)("RedeemHelper ", contract.address);
};
exports.default = deployRedeemHelper;
deployRedeemHelper.id = exports.REDEEM_HELPER_DID;
deployRedeemHelper.tags = ["local", "test"];
