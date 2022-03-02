import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../packages/utils/utils";

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
    log("DAI", deployment.address);
};
export default daiDeployment;
daiDeployment.id = DAI_DID;
daiDeployment.tags = ["local", "test", DAI_DID];
