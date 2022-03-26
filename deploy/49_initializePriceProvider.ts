import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { ExodiaRoles__factory, PriceProvider__factory } from "../packages/sdk/typechain";
import { exec } from "../packages/utils/utils";

import { EXODIA_ROLES_DID } from "./38_deployExodiaRoles";
import { PRICE_PROVIDER_DID } from "./44_deployPriceProvider";

export const PRICE_PROVIDER_INIT_DID = "price_provider_init";

const initPriceProvider: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
    getNetwork,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: pp, deployment } = await get<PriceProvider__factory>(
        "PriceProvider"
    );
    const { contract: roles } = await get<ExodiaRoles__factory>("ExodiaRoles");
    if (deployment?.newlyDeployed) {
        await exec(() => pp.initialize(roles.address));
    }
    /*    await exec(() => pp.setTokenOracle(WFTM, clOracle.address));
    await exec(() => pp.setTokenOracle(MAI_TOKEN, clOracle.address));
    await exec(() => pp.setTokenOracle(DAI, clOracle.address));
    await exec(() => pp.setTokenOracle(GOHM, gOHMOracle.address));*/
};

export default initPriceProvider;
initPriceProvider.id = PRICE_PROVIDER_INIT_DID;
initPriceProvider.tags = ["local", "test", PRICE_PROVIDER_INIT_DID];
initPriceProvider.dependencies = [PRICE_PROVIDER_DID, EXODIA_ROLES_DID];
