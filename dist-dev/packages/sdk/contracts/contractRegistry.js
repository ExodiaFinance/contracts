"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworksContractsRegistry = exports.ContractVersions = exports.version = void 0;
const utils_1 = require("../../utils/utils");
const version = (factory, address = utils_1.ZERO_ADDRESS, deployedAt = 0) => {
    return {
        address,
        deployedAt,
        factory,
    };
};
exports.version = version;
class ContractVersions {
    constructor(versions = []) {
        this.versions = versions;
    }
    getVersion(i) {
        if (i < 0 || i >= this.versions.length) {
            return null;
        }
        return this.versions[i];
    }
    atBlock(block) {
        return this.versions.find((contract) => contract.deployedAt <= block);
    }
    latest() {
        if (this.versions.length === 0) {
            return null;
        }
        return this.versions[this.versions.length - 1];
    }
    append(contract) {
        this.versions.push(contract);
        this.versions.sort((c0, c1) => c1.deployedAt - c0.deployedAt);
    }
}
exports.ContractVersions = ContractVersions;
class NetworksContractsRegistry {
    forNetwork(network) {
        if (!this.networkAvailable(network)) {
            throw new Error(`Network ${network} unavailable`);
        }
        return this[network];
    }
    addNetwork(network, registry) {
        this[network] = registry;
    }
    networkAvailable(network) {
        return Boolean(this[network]);
    }
}
exports.NetworksContractsRegistry = NetworksContractsRegistry;
