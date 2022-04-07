"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BPTMNLT_ORACLE_DID = void 0;
const contracts_1 = require("../packages/sdk/contracts");
const utils_1 = require("../packages/utils/utils");
exports.BPTMNLT_ORACLE_DID = "bptmnlt_oracle_did";
const deployBPTMNLTPriceProvider = async ({ deploy, getNetwork }) => {
    const { contract: oracle, deployment } = await deploy("BPTMNLTPriceOracle", []);
    const { BEETHOVEN_VAULT, THE_MONOLITH_POOLID, FTM_USD_FEED, DAI_USD_FEED } =
        contracts_1.externalAddressRegistry.forNetwork(await getNetwork());
    if (
        true ||
        (deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed)
    ) {
        await oracle.setup(
            BEETHOVEN_VAULT,
            THE_MONOLITH_POOLID,
            [0, 4],
            [FTM_USD_FEED, DAI_USD_FEED]
        );
    }
    (0, utils_1.log)("BPTMNLT oracle: ", oracle.address);
};
exports.default = deployBPTMNLTPriceProvider;
deployBPTMNLTPriceProvider.id = exports.BPTMNLT_ORACLE_DID;
deployBPTMNLTPriceProvider.tags = ["local", "test", exports.BPTMNLT_ORACLE_DID];
