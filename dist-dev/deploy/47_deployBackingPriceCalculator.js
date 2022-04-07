"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BACKING_PRICE_CALCULATOR_DID = void 0;
const utils_1 = require("../packages/utils/utils");
const _38_deployExodiaRoles_1 = require("./38_deployExodiaRoles");
exports.BACKING_PRICE_CALCULATOR_DID = "backing_price_calculator";
const deployBackingPriceCalculator = async ({ deploy, getNetwork }) => {
    const { contract: backingPriceCalculator } = await deploy(
        "BackingPriceCalculator",
        []
    );
    (0, utils_1.log)("backing price calculator", backingPriceCalculator.address);
};
exports.default = deployBackingPriceCalculator;
deployBackingPriceCalculator.id = exports.BACKING_PRICE_CALCULATOR_DID;
deployBackingPriceCalculator.tags = [
    "local",
    "test",
    exports.BACKING_PRICE_CALCULATOR_DID,
];
deployBackingPriceCalculator.dependencies = [_38_deployExodiaRoles_1.EXODIA_ROLES_DID];
