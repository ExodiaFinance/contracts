import { Deployment, DeployResult } from "hardhat-deploy/dist/types";
import { DeployOptions } from "hardhat-deploy/types";
import { extendEnvironment } from "hardhat/config";
import { HttpNetworkConfig, NetworksConfig } from "hardhat/types";

import { ContractFactory } from "../contracts/ContractFactory";
import { ContractVersions, IContract } from "../contracts/contractRegistry";
import { contracts } from "../contracts/exodiaContracts";
import { Network } from "../contracts/Network";
import { ProvidersRegistry } from "../contracts/providersRegistry";

import { IExtendedHRE } from "./ExtendedHRE";

extendEnvironment((hre) => {
    const xhre = hre as IExtendedHRE<any>;
    xhre.contracts = contracts;
    xhre.contracts.addNetwork(
        Network.HARDHAT,
        xhre.contracts.forNetwork(Network.OPERA_MAIN_NET)
    );
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
    const contract = await getContractInstance(contractName, xhre, deployment.address);
    return { contract, deployment };
};

const get = async (xhre: IExtendedHRE<any>, contractName: string) => {
    const deployment = (await xhre.deployments.getOrNull(contractName)) as DeployResult;
    let deployedAddress = deployment?.address;
    if (deployment) {
        deployment.newlyDeployed = false;
    }
    if (!deployedAddress) {
        const contractDeployed = await getContractFromRegistry(contractName, xhre);
        deployedAddress = contractDeployed?.address || "no address found";
    }
    const contract = await getContractInstance(contractName, xhre, deployedAddress);

    return { contract, deployment };
};

const getContractFromRegistry = async (contractName: string, xhre: IExtendedHRE<any>) => {
    const chainId = Number(await xhre.getChainId());
    const blockNumber = await xhre.ethers.provider.getBlockNumber();
    return xhre.contractFactory
        .forNetwork(chainId)
        .getContractAtBlock(contractName, blockNumber);
};

const getContractInstance = async (
    contractName: string,
    xhre: IExtendedHRE<any>,
    address: string
) => {
    const { deployer } = await xhre.getNamedAccounts();
    const signer = await xhre.ethers.getSigner(deployer);
    const contract = await getContractFromRegistry(contractName, xhre);
    if (!contract) {
        throw new Error("Couldn't find typing");
    }
    return contract.factory(address, signer);
};
