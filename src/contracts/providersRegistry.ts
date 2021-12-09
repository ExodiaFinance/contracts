import { ethers, Wallet } from "ethers";

import { Network } from "./Network";

export interface IProvider {
    httpRpc: string[];
}

export class ProvidersRegistry {
    [network: number]: IProvider;
    private privateKey: string | undefined;

    constructor(privateKey?: string) {
        this.privateKey = privateKey;
    }

    public setPrivateKey(pk: string) {
        this.privateKey = pk;
    }

    public getUrl(nid: Network) {
        return this[nid].httpRpc[0];
    }

    public forNetwork(nid: Network) {
        const provider = new ethers.providers.JsonRpcProvider(this.getUrl(nid));
        if (this.privateKey) {
            const wallet = new Wallet(this.privateKey);
            return wallet.connect(provider);
        }
        return provider;
    }

    public addNetwork(nid: Network, providers: IProvider) {
        this[nid] = providers;
    }

    public networkAvailable(nid: Network) {
        return Boolean(this[nid]);
    }
}
