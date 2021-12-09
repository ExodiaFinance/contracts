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
    await deployments.deploy("DAI", {
        from: deployer,
        args: [network.config.chainId || 31337],
    });
};
export default daiDeployment;
daiDeployment.id = DAI_DID;
daiDeployment.tags = ["local", "test", DAI_DID];
