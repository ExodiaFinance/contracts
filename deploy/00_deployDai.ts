import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";

export const DAI_DID = "dai_token";

const daiDeployment: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deployments,
    getNamedAccounts,
    network,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { deployer } = await getNamedAccounts();
    const deployment = await deployments.deploy("DAI", {
        from: deployer,
        args: [network.config.chainId || 31337],
    });
    console.log("DAI", deployment.address);
};
export default daiDeployment;
daiDeployment.id = DAI_DID;
daiDeployment.tags = ["local", "test", DAI_DID];
