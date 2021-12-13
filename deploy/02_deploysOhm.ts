import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import { log, OHM_DECIMALS, toWei } from "../src/utils";
import { SOlympus__factory } from "../typechain";

export const SOHM_DID = "sohm_token";

const sohmDeployment: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract, deployment } = await deploy<SOlympus__factory>("sOlympus", []);
    log("sOHM ", contract.address);
    if (deployment?.newlyDeployed) {
        await contract.setIndex(toWei(1, OHM_DECIMALS));
    }
};
export default sohmDeployment;
sohmDeployment.id = SOHM_DID;
sohmDeployment.tags = ["local", "test", SOHM_DID];
