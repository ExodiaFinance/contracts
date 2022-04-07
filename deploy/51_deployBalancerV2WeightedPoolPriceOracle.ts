import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../packages/utils/utils";
import { ChainlinkPriceOracle__factory } from "../packages/sdk/typechain";

export const BALANCER_V2_WEIGHTED_POOL_PRICE_ORACLE_DID =
    "balancer_v2_weighted_pool_price_oracle";

const deployBalancerV2WeightedPoolPriceOracle: IExtendedDeployFunction<IExodiaContractsRegistry> =
    async ({ deploy }: IExtendedHRE<IExodiaContractsRegistry>) => {
        const { contract: BalancerV2WeightedPoolPriceOracle, deployment } =
            await deploy<ChainlinkPriceOracle__factory>(
                "BalancerV2WeightedPoolPriceOracle",
                []
            );
        log(
            "balancer v2 weighted pool price oracle",
            BalancerV2WeightedPoolPriceOracle.address
        );
    };
export default deployBalancerV2WeightedPoolPriceOracle;
deployBalancerV2WeightedPoolPriceOracle.id = BALANCER_V2_WEIGHTED_POOL_PRICE_ORACLE_DID;
deployBalancerV2WeightedPoolPriceOracle.tags = [
    "local",
    "test",
    BALANCER_V2_WEIGHTED_POOL_PRICE_ORACLE_DID,
];
