import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../src/utils";
import { ExodiaRoles__factory } from "../typechain";

export const EXODIA_ROLES_DID = "exodia_roles";

const deployExodiaRoles: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    getNamedAccounts,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { deployer, DAO } = await getNamedAccounts();
    const { contract: roles } = await deploy<ExodiaRoles__factory>("ExodiaRoles", [
        deployer,
    ]);
    log("Exodia roles: ", roles.address);
};
export default deployExodiaRoles;
deployExodiaRoles.id = EXODIA_ROLES_DID;
deployExodiaRoles.tags = ["local", "test", EXODIA_ROLES_DID];
deployExodiaRoles.dependencies = [];
