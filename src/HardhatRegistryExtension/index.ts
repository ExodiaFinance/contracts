import { DeployResult } from "hardhat-deploy/dist/types";
import { DeployOptions } from "hardhat-deploy/types";
import { extendEnvironment } from "hardhat/config";
import { HttpNetworkConfig, NetworksConfig } from "hardhat/types";

import { ContractFactory } from "../contracts/ContractFactory";
import { ContractVersions, IContract } from "../contracts/contractRegistry";
import { contracts } from "../contracts/exodiaContracts";
import { ProvidersRegistry } from "../contracts/providersRegistry";

import { IExtendedHRE } from "./ExtendedHRE";

extendEnvironment((hre) => {
    const xhre = hre as IExtendedHRE<any>;
    xhre.contracts = contracts;

    xhre.contractFactory = createContractFactory(hre.config.networks);
    xhre.getContract = async <K>(
        contractName: string | number | symbol,
        block?: number
    ) => getContract<any, K>(xhre, contractName, block);
    xhre.deploy = (contract: string, constructor: any[], opt: any) =>
        deploy(xhre, contract, constructor, opt);
    xhre.get = (contractName: string) => get(xhre, contractName);
});

const createContractFactory = (networks: NetworksConfig) => {
    const providers = new ProvidersRegistry();
    for (const network of Object.keys(networks)) {
        const config = networks[network] as HttpNetworkConfig;
        providers.addNetwork(config.chainId || 0, {
            httpRpc: [config.url],
        });
    }
    providers.setPrivateKey(process.env.DEPLOYER_SECRET_KEY || "no key");
    return new ContractFactory<any>(providers, contracts);
};

const getContract = async <T, K>(
    xhre: IExtendedHRE<T>,
    contractName: keyof T,
    block?: number
) => {
    const chainId = Number(await xhre.getChainId());
    const contractVersions = xhre.contracts.forNetwork(chainId)[
        contractName
    ] as unknown as ContractVersions<any>;
    const blockNumber = block || (await xhre.ethers.provider.getBlockNumber());
    console.log(blockNumber);
    return contractVersions.atBlock(blockNumber) as IContract<K>;
};

const deploy = async (
    xhre: IExtendedHRE<any>,
    contractName: string,
    constructorArgs: any[],
    options: DeployOptions
) => {
    const { deployer } = await xhre.getNamedAccounts();
    const deployOptions: DeployOptions = (options || {
        from: deployer,
    }) as DeployOptions;
    deployOptions.args = constructorArgs;
    const deployment = await xhre.deployments.deploy(contractName, deployOptions);
    const chainId = Number(await xhre.getChainId());
    const blockNumber = await xhre.ethers.provider.getBlockNumber();
    const contract = await xhre.contractFactory
        .forNetwork(chainId)
        .getContractAtBlock(contractName, blockNumber);
    if (!contract) {
        throw new Error("Couldn't find typing");
    }
    const contractInstance = contract.factory(
        deployment.address,
        xhre.contractFactory.providers.forNetwork(chainId)
    );
    return { contract: contractInstance, deployment };
};

const get = async (xhre: IExtendedHRE<any>, contractName: string) => {
    const deployment = (await xhre.deployments.get(contractName)) as DeployResult;
    deployment.newlyDeployed = false;
    const chainId = Number(await xhre.getChainId());
    const blockNumber = await xhre.ethers.provider.getBlockNumber();
    const contract = await xhre.contractFactory
        .forNetwork(chainId)
        .getContractAtBlock(contractName, blockNumber);
    if (!contract) {
        throw new Error("Couldn't find typing");
    }
    const contractInstance = contract.factory(
        deployment.address || contract.address,
        xhre.contractFactory.providers.forNetwork(chainId)
    );
    return { contract: contractInstance, deployment };
};
