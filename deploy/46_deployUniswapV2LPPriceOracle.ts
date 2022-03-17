import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { UniswapV2LPPriceOracle__factory } from "../packages/sdk/typechain";
import { log } from "../packages/utils/utils";

export const UNISWAPV2_LP_PRICE_ORACLE_DID = "uniswapv2_lp_price_oracle";

const deployUniswapV2LPPriceOracle: IExtendedDeployFunction<IExodiaContractsRegistry> =
    async ({ deploy, getNetwork }: IExtendedHRE<IExodiaContractsRegistry>) => {
        const { contract: uniswapV2LPPriceOracle } =
            await deploy<UniswapV2LPPriceOracle__factory>("UniswapV2LPPriceOracle", []);
        log("chainlink price oracle", uniswapV2LPPriceOracle.address);
    };
export default deployUniswapV2LPPriceOracle;
deployUniswapV2LPPriceOracle.id = UNISWAPV2_LP_PRICE_ORACLE_DID;
deployUniswapV2LPPriceOracle.tags = ["local", "test", UNISWAPV2_LP_PRICE_ORACLE_DID];
