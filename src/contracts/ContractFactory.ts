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

    public forNetwork(nid: Network, provider?: Provider | Signer | null) {
        if (!this.providers.networkAvailable(nid) && !provider) {
            throw Error(`Network ${nid} is not available`);
        }
        const networkProvider = provider || this.providers.forNetwork(nid);
        return new NetworkContractFactory<T>(
            networkProvider,
            this.contracts.forNetwork(nid)
        );
    }
}

export class NetworkContractFactory<T> {
    private readonly networkProvider: Provider | Signer;
    private readonly contracts: IContractsRegistry;

    constructor(provider: Provider | Signer, contractsRegistry: IContractsRegistry) {
        this.networkProvider = provider;
        this.contracts = contractsRegistry;
    }

    public getContractVersions(contractName: keyof T): ContractVersions<any> {
        const key = contractName as string;
        return this.contracts[key];
    }

    public getContractAtBlock(contractName: keyof T, atBlock: number) {
        const key = contractName as string;
        return this.contracts[key].atBlock(atBlock);
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
