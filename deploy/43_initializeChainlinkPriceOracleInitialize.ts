import contract from "web3/eth/contract";

import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { externalAddressRegistry } from "../packages/sdk/contracts";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import {
    ChainlinkPriceOracle__factory,
    ExodiaRoles__factory,
} from "../packages/sdk/typechain";
import { exec, ifNotProd, log } from "../packages/utils/utils";

import { EXODIA_ROLES_DID } from "./38_deployExodiaRoles";
import { BALANCER_V2_PRICE_ORACLE_DID } from "./42_deployBalancerV2PriceOracle";
import { CHAINLINK_PRICE_ORACLE_DID } from "./43_deployChainlinkPriceOracle";

export const CHAINLINK_PRICE_ORACLE_INITIALIZE_DID = "chainlink_price_oracle_init";

const initializeChainlinkPriceOracle: IExtendedDeployFunction<IExodiaContractsRegistry> =
    async ({ deploy, get, getNetwork }: IExtendedHRE<IExodiaContractsRegistry>) => {
        const { contract: chainlinkPriceOracle, deployment } =
            await get<ChainlinkPriceOracle__factory>("ChainlinkPriceOracle");
        const { contract: exodiaRoles } = await get<ExodiaRoles__factory>("ExodiaRoles");
        const { WFTM, FTM_USD_FEED, MAI_TOKEN } = externalAddressRegistry.forNetwork(
            await getNetwork()
        );
        await exec(() =>
            chainlinkPriceOracle.initialize(exodiaRoles.address, FTM_USD_FEED)
        );
        // DAI
        await exec(() =>
            chainlinkPriceOracle.setPriceFeed(
                "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
                "0x91d5DEFAFfE2854C7D02F50c80FA1fdc8A721e52"
            )
        );
        await exec(() => chainlinkPriceOracle.setPriceFeed(WFTM, FTM_USD_FEED));
        await exec(() =>
            chainlinkPriceOracle.setPriceFeed(
                MAI_TOKEN,
                "0x827863222c9C603960dE6FF2c0dD58D457Dcc363"
            )
        );
        log("Chainlink oracle initialized", chainlinkPriceOracle.address);
    };
export default initializeChainlinkPriceOracle;
initializeChainlinkPriceOracle.id = CHAINLINK_PRICE_ORACLE_INITIALIZE_DID;
initializeChainlinkPriceOracle.tags = [
    "local",
    "test",
    CHAINLINK_PRICE_ORACLE_INITIALIZE_DID,
];
initializeChainlinkPriceOracle.dependencies = ifNotProd([
    CHAINLINK_PRICE_ORACLE_DID,
    EXODIA_ROLES_DID,
]);
