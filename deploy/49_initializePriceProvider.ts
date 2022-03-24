import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { externalAddressRegistry } from "../packages/sdk/contracts";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import {
    ChainlinkPriceOracle__factory,
    ExodiaRoles__factory,
    GOHMPriceOracle,
    GOHMPriceOracle__factory,
    PriceProvider__factory,
    StrategyWhitelist__factory,
} from "../packages/sdk/typechain";
import { exec, log } from "../packages/utils/utils";
import { GOHM_ORACLE_DID } from "./21_deployGOHMPriceOracle";

import { EXODIA_ROLES_DID } from "./38_deployExodiaRoles";
import { CHAINLINK_PRICE_ORACLE_DID } from "./43_deployChainlinkPriceOracle";
import { PRICE_PROVIDER_DID } from "./44_deployPriceProvider";

export const PRICE_PROVIDER_INIT_DID = "price_provider_init";

const initPriceProvider: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
    getNetwork,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: pp } = await get<PriceProvider__factory>("PriceProvider");
    const { contract: roles } = await get<ExodiaRoles__factory>("ExodiaRoles");
    const { contract: clOracle } = await get<ChainlinkPriceOracle__factory>(
        "ChainlinkPriceOracle"
    );
    const { contract: gOHMOracle } = await get<GOHMPriceOracle__factory>(
        "GOHMPriceOracle"
    );
    const { WFTM, MAI_TOKEN, DAI, GOHM } = externalAddressRegistry.forNetwork(
        await getNetwork()
    );
    await exec(() => pp.initialize(roles.address));
    await exec(() => pp.setTokenOracle(WFTM, clOracle.address));
    await exec(() => pp.setTokenOracle(MAI_TOKEN, clOracle.address));
    await exec(() => pp.setTokenOracle(DAI, clOracle.address));
    await exec(() => pp.setTokenOracle(GOHM, gOHMOracle.address));
};

export default initPriceProvider;
initPriceProvider.id = PRICE_PROVIDER_INIT_DID;
initPriceProvider.tags = ["local", "test", PRICE_PROVIDER_INIT_DID];
initPriceProvider.dependencies = [
    PRICE_PROVIDER_DID,
    EXODIA_ROLES_DID,
    GOHM_ORACLE_DID,
    CHAINLINK_PRICE_ORACLE_DID,
];
