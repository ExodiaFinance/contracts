"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRICE_PROVIDER_INIT_DID = void 0;
const utils_1 = require("../packages/utils/utils");
const _38_deployExodiaRoles_1 = require("./38_deployExodiaRoles");
const _44_deployPriceProvider_1 = require("./44_deployPriceProvider");
exports.PRICE_PROVIDER_INIT_DID = "price_provider_init";
const initPriceProvider = async ({ deploy, get, getNetwork }) => {
    const { contract: pp, deployment } = await get("PriceProvider");
    const { contract: roles } = await get("ExodiaRoles");
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        await (0, utils_1.exec)(() => pp.initialize(roles.address));
    }
    /*    await exec(() => pp.setTokenOracle(WFTM, clOracle.address));
    await exec(() => pp.setTokenOracle(MAI_TOKEN, clOracle.address));
    await exec(() => pp.setTokenOracle(DAI, clOracle.address));
    await exec(() => pp.setTokenOracle(GOHM, gOHMOracle.address));*/
};
exports.default = initPriceProvider;
initPriceProvider.id = exports.PRICE_PROVIDER_INIT_DID;
initPriceProvider.tags = ["local", "test", exports.PRICE_PROVIDER_INIT_DID];
initPriceProvider.dependencies = [
    _44_deployPriceProvider_1.PRICE_PROVIDER_DID,
    _38_deployExodiaRoles_1.EXODIA_ROLES_DID,
];
