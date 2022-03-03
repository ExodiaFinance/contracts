import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../src/utils";
import { PriceProvider__factory } from "../typechain";
import { EXODIA_ROLES_DID } from "./38_deployExodiaRoles";

export const PRICE_PROVIDER_DID = "price_provider";

const deployPriceProvider: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    getNetwork,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: priceProvider } = await deploy<PriceProvider__factory>(
        "PriceProvider",
        []
    );
    log("price provider", priceProvider.address);
};
export default deployPriceProvider;
deployPriceProvider.id = PRICE_PROVIDER_DID;
deployPriceProvider.tags = ["local", "test", EXODIA_ROLES_DID];
