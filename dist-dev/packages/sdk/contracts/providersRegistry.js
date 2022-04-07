"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvidersRegistry = void 0;
const ethers_1 = require("ethers");
class ProvidersRegistry {
    constructor(privateKey) {
        this.privateKey = privateKey;
    }
    setPrivateKey(pk) {
        this.privateKey = pk;
    }
    getUrl(nid) {
        return this[nid].httpRpc[0];
    }
    forNetwork(nid) {
        const provider = new ethers_1.ethers.providers.JsonRpcProvider(this.getUrl(nid));
        if (this.privateKey) {
            const wallet = new ethers_1.Wallet(this.privateKey);
            return wallet.connect(provider);
        }
        return provider;
    }
    addNetwork(nid, providers) {
        this[nid] = providers;
    }
    networkAvailable(nid) {
        return Boolean(this[nid]);
    }
}
exports.ProvidersRegistry = ProvidersRegistry;
