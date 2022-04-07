"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providers = void 0;
const Network_1 = require("./Network");
const providersRegistry_1 = require("./providersRegistry");
exports.providers = new providersRegistry_1.ProvidersRegistry();
exports.providers.addNetwork(Network_1.Network.OPERA_MAIN_NET, {
    httpRpc: ["https://rpc.ftm.tools"],
});
exports.providers.addNetwork(Network_1.Network.OPERA_TEST_NET, {
    httpRpc: ["https://rpc.testnet.fantom.network/"],
});
