import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../packages/utils/utils";
import { OlympusERC20Token__factory } from "../packages/sdk/typechain";

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
