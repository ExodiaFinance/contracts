"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USDC_ADDRESS = exports.GOHM_ADDRESS = exports.GOHM_ORACLE_DID = void 0;
const contracts_1 = require("../packages/sdk/contracts");
const utils_1 = require("../packages/utils/utils");
exports.GOHM_ORACLE_DID = "gohm_oracle_did";
exports.GOHM_ADDRESS = "0x91fa20244Fb509e8289CA630E5db3E9166233FDc";
exports.USDC_ADDRESS = "0x04068da6c83afcfa0e13ba15a6696662335d5b75";
const deployDaiBond = async ({ deploy, getNetwork }) => {
    const { OHM_INDEX_FEED, OHM_USD_FEED, FTM_USD_FEED } =
        contracts_1.externalAddressRegistry.forNetwork(await getNetwork());
    const { contract: oracle, deployment } = await deploy("GOHMPriceOracle", [
        OHM_USD_FEED,
        OHM_INDEX_FEED,
        FTM_USD_FEED,
    ]);
    (0, utils_1.log)("gOHM oracle: ", oracle.address);
};
exports.default = deployDaiBond;
deployDaiBond.id = exports.GOHM_ORACLE_DID;
deployDaiBond.tags = ["local", "test", exports.GOHM_ORACLE_DID];
