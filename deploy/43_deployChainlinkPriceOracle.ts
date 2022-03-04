import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../packages/utils/utils";
import { ChainlinkPriceOracle__factory } from "../packages/sdk/typechain";
import { EXODIA_ROLES_DID } from "./38_deployExodiaRoles";

export const CHAINLINK_PRICE_ORACLE_DID = "chainlink_price_oracle";

const deployChainlinkPriceOracle: IExtendedDeployFunction<IExodiaContractsRegistry> =
    async ({ deploy, getNetwork }: IExtendedHRE<IExodiaContractsRegistry>) => {
        const { contract: chainlinkPriceOracle } =
            await deploy<ChainlinkPriceOracle__factory>("ChainlinkPriceOracle", []);
        log("chainlink price oracle", chainlinkPriceOracle.address);
    };
export default deployChainlinkPriceOracle;
deployChainlinkPriceOracle.id = CHAINLINK_PRICE_ORACLE_DID;
deployChainlinkPriceOracle.tags = ["local", "test", EXODIA_ROLES_DID];
