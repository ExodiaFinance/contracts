"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRICE_PROVIDER_DID = void 0;
const utils_1 = require("../packages/utils/utils");
exports.PRICE_PROVIDER_DID = "price_provider";
const deployPriceProvider = async ({ deploy, getNetwork }) => {
    const { contract: priceProvider } = await deploy("PriceProvider", []);
    (0, utils_1.log)("price provider", priceProvider.address);
};
exports.default = deployPriceProvider;
deployPriceProvider.id = exports.PRICE_PROVIDER_DID;
deployPriceProvider.tags = ["local", "test", exports.PRICE_PROVIDER_DID];
