import { JsonRpcProvider, Provider } from "@ethersproject/providers";
import { ethers, Signer, Wallet } from "ethers";

import {
    ContractVersions,
    IContract,
    IContractsRegistry,
    NetworksContractsRegistry,
} from "./contractRegistry";
import { Network } from "./Network";
import { ProvidersRegistry } from "./providersRegistry";

export class ContractFactory<T> {
    public readonly providers: ProvidersRegistry;
    private contracts: NetworksContractsRegistry<IContractsRegistry>;

    constructor(
        providersRegistry: ProvidersRegistry,
        contractsRegistry: NetworksContractsRegistry<any>
    ) {
        this.providers = providersRegistry;
        this.contracts = contractsRegistry;
    }

    public forNetwork(nid: Network) {
        return new NetworkContractFactory<T>(nid, this.providers, this.contracts);
    }
}

export class NetworkContractFactory<T> {
    private readonly network: Network;
    private readonly networkProvider: JsonRpcProvider | Wallet;
    private providers: ProvidersRegistry;
    private contracts: NetworksContractsRegistry<IContractsRegistry>;

    constructor(
        network: Network,
        providersRegistry: ProvidersRegistry,
        contractsRegistry: NetworksContractsRegistry<IContractsRegistry>
    ) {
        this.providers = providersRegistry;
        this.contracts = contractsRegistry;
        this.network = network;
        if (!this.providers.networkAvailable(this.network)) {
            throw Error(`Network ${network} is not available`);
        }
        this.networkProvider = this.providers.forNetwork(network);
    }

    public getContractVersions(contractName: keyof T): ContractVersions<any> {
        const key = contractName as string;
        return this.contracts.forNetwork(this.network)[key];
    }

    public getContractAtBlock(contractName: keyof T, atBlock: number) {
        const key = contractName as string;
        return this.contracts.forNetwork(this.network)[key].atBlock(atBlock);
    }

    public getContract(contractName: keyof T, version: number) {
        return this.getContractVersions(contractName).getVersion(version);
    }

    public getLatestContract(contractName: keyof T) {
        return this.getContractVersions(contractName).latest();
    }

    public getLatestContractInstance<K>(contractName: keyof T) {
        const contract = this.getLatestContract(contractName);
        return contract?.factory(contract.address, this.networkProvider) as K;
    }

    public getContractInstanceAtBlock<K>(contractName: keyof T, blockNumber: number) {
        const contract = this.getContractAtBlock(contractName, blockNumber);
        return contract?.factory(contract.address, this.networkProvider) as K;
    }
}
