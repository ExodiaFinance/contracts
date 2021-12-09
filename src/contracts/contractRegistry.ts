import { Provider } from "@ethersproject/providers";
import { Signer } from "ethers";
import { zeroAddress } from "../subdeploy/deployBasics";

import { Network } from "./Network";

export interface IContract<T> {
    address: string;
    deployedAt: number;
    factory: (address: string, signerOrProvider: Signer | Provider) => T;
}

export const version = (
    factory: (address: string, signerOrProvider: Signer | Provider) => any,
    address = zeroAddress,
    deployedAt = 0
) => {
    return {
        address,
        deployedAt,
        factory,
    };
};

export class ContractVersions<T> {
    private readonly versions: IContract<T>[];

    constructor(versions: IContract<T>[] = []) {
        this.versions = versions;
    }

    public getVersion(i: number) {
        if (i < 0 || i >= this.versions.length) {
            return null;
        }
        return this.versions[i];
    }

    public atBlock(block: number) {
        return this.versions.find((contract) => contract.deployedAt <= block);
    }

    public latest() {
        if (this.versions.length === 0) {
            return null;
        }
        return this.versions[this.versions.length - 1];
    }

    public append(contract: IContract<T>) {
        this.versions.push(contract);
        this.versions.sort((c0, c1) => c1.deployedAt - c0.deployedAt);
    }
}

export interface IContractsRegistry {
    [contract: string]: ContractVersions<any>;
}

export class NetworksContractsRegistry<T> {
    [network: number]: T;

    public forNetwork(network: Network): T {
        if (!this.networkAvailable(network)) {
            throw new Error(`Network ${network} unavailable`);
        }
        return this[network];
    }

    public addNetwork(network: Network, registry: T) {
        this[network] = registry;
    }

    public networkAvailable(network: Network): boolean {
        return Boolean(this[network]);
    }
}
