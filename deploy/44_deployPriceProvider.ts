import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { PriceProvider__factory } from "../packages/sdk/typechain";
import { log } from "../packages/utils/utils";

export const PRICE_PROVIDER_DID = "price_provider";

const deployPriceProvider: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: priceProvider } = await deploy<PriceProvider__factory>(
        "PriceProvider",
        []
    );
    log("price provider", priceProvider.address);
};
export default deployPriceProvider;
deployPriceProvider.id = PRICE_PROVIDER_DID;
deployPriceProvider.tags = ["local", "test", PRICE_PROVIDER_DID];
