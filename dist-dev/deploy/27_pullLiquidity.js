"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PULL_LIQUIDITY_DID = void 0;
const contracts_1 = require("../packages/sdk/contracts");
const utils_1 = require("../packages/utils/utils");
const _20_deployRemoveUniLPStrategy_1 = require("./20_deployRemoveUniLPStrategy");
exports.PULL_LIQUIDITY_DID = "pull_liquidity";
const removeLp = async ({ get, deploy, getNamedAccounts, getNetwork }) => {
    const { deployer } = await getNamedAccounts();
    const { SPOOKY_ROUTER, EXODDAI_LP } = contracts_1.externalAddressRegistry.forNetwork(
        await getNetwork()
    );
    const { contract: removeUniLP } = await get("RemoveUniLp");
    await removeUniLP.remove(SPOOKY_ROUTER, EXODDAI_LP);
};
exports.default = removeLp;
removeLp.id = exports.PULL_LIQUIDITY_DID;
removeLp.tags = ["local", "test", exports.PULL_LIQUIDITY_DID];
removeLp.dependencies = (0, utils_1.ifNotProd)([
    _20_deployRemoveUniLPStrategy_1.DEPLOY_REMOVE_UNI_LP_STRATEGY_DID,
]);
