import {
    Deployment,
    DeploymentsExtension,
    DeployResult,
} from "hardhat-deploy/dist/types";
import { DeployOptions } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ContractFactory } from "../contracts/ContractFactory";
import { IContract, NetworksContractsRegistry } from "../contracts/contractRegistry";

export interface IDeployable {
    deploy(...string: any): any;
}

type Except<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type PartialBy<T, K extends keyof T> = Except<T, K> & Partial<Pick<T, K>>;
type PromiseReturnType<T> = T extends Promise<infer Return> ? Return : T;

export interface DeployedContract<K> {
    contract: PromiseReturnType<K>;
    deployment: DeployResult;
}

export interface IHRERegistryExtension<T> {
    contracts: NetworksContractsRegistry<T>;
    contractFactory: ContractFactory<T>;
    getNamedAccounts: () => Promise<{ [name: string]: string }>;
    getChainId(): Promise<string>;
    getContract<K>(contractName: keyof T, block: number): Promise<IContract<K>>;
    deploy<K extends IDeployable>(
        contractName: keyof T,
        constructorParameters: Parameters<K["deploy"]>,
        options?: Omit<PartialBy<DeployOptions, "from">, "args">
    ): Promise<DeployedContract<ReturnType<K["deploy"]>>>;
    get<K extends IDeployable>(
        contractName: keyof T
    ): Promise<DeployedContract<ReturnType<K["deploy"]>>>;
}

export interface IExtendedHRE<T>
    extends HardhatRuntimeEnvironment,
        IHRERegistryExtension<T> {
    deployments: DeploymentsExtension;
}
