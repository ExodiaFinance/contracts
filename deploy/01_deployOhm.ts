import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../src/utils";
import { OlympusERC20Token__factory } from "../typechain";

export const OHM_DID = "ohm_token";

const ohmDeployment: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract } = await deploy<OlympusERC20Token__factory>(
        "OlympusERC20Token",
        []
    );
    log("OHM ", contract.address);
};
export default ohmDeployment;
ohmDeployment.id = OHM_DID;
ohmDeployment.tags = ["local", "test", OHM_DID];
