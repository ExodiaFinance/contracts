import contract from "web3/eth/contract";

import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { externalAddressRegistry } from "../packages/sdk/contracts";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import {
    BalancerV2PriceOracle__factory,
    ExodiaRoles__factory,
} from "../packages/sdk/typechain";
import { exec, ifNotProd, log } from "../packages/utils/utils";

import { EXODIA_ROLES_DID } from "./38_deployExodiaRoles";
import { BALANCER_V2_PRICE_ORACLE_DID } from "./42_deployBalancerV2PriceOracle";

export const BALANCER_V2_PRICE_ORACLE_INIT_DID = "balancer_v2_price_oracle_init";

const deployBalancerV2PriceOracle: IExtendedDeployFunction<IExodiaContractsRegistry> =
    async ({ deploy, get, getNetwork }: IExtendedHRE<IExodiaContractsRegistry>) => {
        const { contract: balancerV2PriceOracle, deployment } =
            await get<BalancerV2PriceOracle__factory>("BalancerV2PriceOracle");
        const { contract: exodiaRoles } = await get<ExodiaRoles__factory>("ExodiaRoles");
        const { BEETHOVEN_VAULT } = externalAddressRegistry.forNetwork(
            await getNetwork()
        );
        await balancerV2PriceOracle.initialize(
            exodiaRoles.address,
            BEETHOVEN_VAULT,
            1800
        );
        log("balancer v2 price oracle initialized", balancerV2PriceOracle.address);
    };
export default deployBalancerV2PriceOracle;
deployBalancerV2PriceOracle.id = BALANCER_V2_PRICE_ORACLE_INIT_DID;
deployBalancerV2PriceOracle.tags = ["local", "test", BALANCER_V2_PRICE_ORACLE_INIT_DID];
deployBalancerV2PriceOracle.dependencies = ifNotProd([
    BALANCER_V2_PRICE_ORACLE_DID,
    EXODIA_ROLES_DID,
]);
