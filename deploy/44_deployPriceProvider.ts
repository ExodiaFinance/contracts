import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../packages/utils/utils";
import { PriceProvider__factory } from "../packages/sdk/typechain";
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
