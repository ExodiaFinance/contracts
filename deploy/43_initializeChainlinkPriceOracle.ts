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
        const { WFTM, FTM_USD_FEED, MAI } = externalAddressRegistry.forNetwork(
            await getNetwork()
        );
        if (deployment?.newlyDeployed) {
            await exec(() =>
                chainlinkPriceOracle.initialize(exodiaRoles.address, FTM_USD_FEED)
            );
        }
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
