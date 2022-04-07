"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNISWAPV2_LP_PRICE_ORACLE_DID = void 0;
const utils_1 = require("../packages/utils/utils");
exports.UNISWAPV2_LP_PRICE_ORACLE_DID = "uniswapv2_lp_price_oracle";
const deployUniswapV2LPPriceOracle = async ({ deploy, getNetwork }) => {
    const { contract: uniswapV2LPPriceOracle } = await deploy(
        "UniswapV2LPPriceOracle",
        []
    );
    (0, utils_1.log)("chainlink price oracle", uniswapV2LPPriceOracle.address);
};
exports.default = deployUniswapV2LPPriceOracle;
deployUniswapV2LPPriceOracle.id = exports.UNISWAPV2_LP_PRICE_ORACLE_DID;
deployUniswapV2LPPriceOracle.tags = [
    "local",
    "test",
    exports.UNISWAPV2_LP_PRICE_ORACLE_DID,
];
