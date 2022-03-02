import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../packages/utils/utils";
import { BalancerV2PriceOracle__factory } from "../packages/sdk/typechain";
import { EXODIA_ROLES_DID } from "./38_deployExodiaRoles";

export const BALANCER_V2_PRICE_ORACLE_DID = "balancer_v2_price_oracle";

const deployBalancerV2PriceOracle: IExtendedDeployFunction<IExodiaContractsRegistry> =
    async ({ deploy, getNetwork }: IExtendedHRE<IExodiaContractsRegistry>) => {
        const { contract: balancerV2PriceOracle } =
            await deploy<BalancerV2PriceOracle__factory>("BalancerV2PriceOracle", []);
        log("balancer v2 price oracle", balancerV2PriceOracle.address);
    };
export default deployBalancerV2PriceOracle;
deployBalancerV2PriceOracle.id = BALANCER_V2_PRICE_ORACLE_DID;
deployBalancerV2PriceOracle.tags = ["local", "test", EXODIA_ROLES_DID];
