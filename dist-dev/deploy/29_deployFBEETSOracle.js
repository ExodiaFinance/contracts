"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FBEETS_ORACLE_DID = void 0;
const contracts_1 = require("../packages/sdk/contracts");
const utils_1 = require("../packages/utils/utils");
exports.FBEETS_ORACLE_DID = "fbeets_oracle";
const deployfBeetsBonds = async ({ deploy, getNetwork }) => {
    const { FIDELIO_DUETTO, FTM_USD_FEED, FBEETS_BAR } =
        contracts_1.externalAddressRegistry.forNetwork(await getNetwork());
    const { contract: bond } = await deploy("fBEETSPriceOracle", [
        FIDELIO_DUETTO,
        FTM_USD_FEED,
        FBEETS_BAR,
    ]);
    (0, utils_1.log)("fBeets oracle", bond.address);
};
exports.default = deployfBeetsBonds;
deployfBeetsBonds.id = exports.FBEETS_ORACLE_DID;
deployfBeetsBonds.tags = ["local", "test", exports.FBEETS_ORACLE_DID];
