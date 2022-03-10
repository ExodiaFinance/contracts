import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { ExodiaRoles__factory } from "../packages/sdk/typechain";
import { log } from "../packages/utils/utils";

export const EXODIA_ROLES_DID = "exodia_roles";

const deployExodiaRoles: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    getNamedAccounts,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { deployer, DAO } = await getNamedAccounts();
    const { contract: roles } = await deploy<ExodiaRoles__factory>("ExodiaRoles", [
        deployer,
    ]);
    await roles.addArchitect(deployer);
    log("Exodia roles: ", roles.address);
};
export default deployExodiaRoles;
deployExodiaRoles.id = EXODIA_ROLES_DID;
deployExodiaRoles.tags = ["local", "test", EXODIA_ROLES_DID];
deployExodiaRoles.dependencies = [];
