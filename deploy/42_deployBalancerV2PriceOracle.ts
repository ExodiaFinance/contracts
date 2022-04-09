import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { ChainlinkPriceOracle__factory } from "../packages/sdk/typechain";
import { exec, log } from "../packages/utils/utils";

export const BALANCER_V2_PRICE_ORACLE_DID = "balancer_v2_price_oracle";

const deployBalancerV2PriceOracle: IExtendedDeployFunction<IExodiaContractsRegistry> =
    async ({ deploy }: IExtendedHRE<IExodiaContractsRegistry>) => {
        const { contract: balancerV2PriceOracle } =
            await deploy<ChainlinkPriceOracle__factory>("BalancerV2PriceOracle", []);
        log("balancer v2 price oracle", balancerV2PriceOracle.address);
    };
export default deployBalancerV2PriceOracle;
deployBalancerV2PriceOracle.id = BALANCER_V2_PRICE_ORACLE_DID;
deployBalancerV2PriceOracle.tags = ["local", "test", BALANCER_V2_PRICE_ORACLE_DID];
