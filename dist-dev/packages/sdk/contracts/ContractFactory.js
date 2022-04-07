"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkContractFactory = exports.ContractFactory = void 0;
class ContractFactory {
    constructor(providersRegistry, contractsRegistry) {
        this.providers = providersRegistry;
        this.contracts = contractsRegistry;
    }
    forNetwork(nid, provider) {
        if (!this.providers.networkAvailable(nid) && !provider) {
            throw Error(`Network ${nid} is not available`);
        }
        const networkProvider = provider || this.providers.forNetwork(nid);
        return new NetworkContractFactory(
            networkProvider,
            this.contracts.forNetwork(nid)
        );
    }
}
exports.ContractFactory = ContractFactory;
class NetworkContractFactory {
    constructor(provider, contractsRegistry) {
        this.networkProvider = provider;
        this.contracts = contractsRegistry;
    }
    getContractVersions(contractName) {
        const key = contractName;
        return this.contracts[key];
    }
    getContractAtBlock(contractName, atBlock) {
        const key = contractName;
        return this.contracts[key].atBlock(atBlock);
    }
    getContract(contractName, version) {
        return this.getContractVersions(contractName).getVersion(version);
    }
    getLatestContract(contractName) {
        return this.getContractVersions(contractName).latest();
    }
    getLatestContractInstance(contractName) {
        const contract = this.getLatestContract(contractName);
        return contract === null || contract === void 0
            ? void 0
            : contract.factory(contract.address, this.networkProvider);
    }
    getContractInstanceAtBlock(contractName, blockNumber) {
        const contract = this.getContractAtBlock(contractName, blockNumber);
        return contract === null || contract === void 0
            ? void 0
            : contract.factory(contract.address, this.networkProvider);
    }
}
exports.NetworkContractFactory = NetworkContractFactory;
