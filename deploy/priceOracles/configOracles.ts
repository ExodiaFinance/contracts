import { IExtendedDeployFunction } from "../../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../../packages/HardhatRegistryExtension/ExtendedHRE";
import { externalAddressRegistry } from "../../packages/sdk/contracts";
import {
    IExodiaContractsRegistry,
    IExternalContractsRegistry,
} from "../../packages/sdk/contracts/exodiaContracts";
import {
    ChainlinkPriceOracle__factory,
    PriceProvider__factory,
    SolidlyTWAPOracle__factory,
} from "../../packages/sdk/typechain";
import { exec } from "../../packages/utils/utils";
import { CHAINLINK_PRICE_ORACLE_DID } from "../43_deployChainlinkPriceOracle";
import { PRICE_PROVIDER_DID } from "../44_deployPriceProvider";
import { SOLIDLY_TWAP_ORACLE_DID } from "../50_deploySolidlyTwapOracle";

type OracleConfig = (
    xhre: IExtendedHRE<IExodiaContractsRegistry>,
    registry: IExternalContractsRegistry
) => Promise<{ token: string; oracle: string }>;

const configTokenOracleFactory = (oracleConfig: OracleConfig) => {
    return (xhre: IExtendedHRE<IExodiaContractsRegistry>) =>
        configTokenOracle(xhre, oracleConfig);
};

const configTokenOracle = async (
    xhre: IExtendedHRE<IExodiaContractsRegistry>,
    configOracle: OracleConfig
) => {
    const { contract: pp } = await xhre.get<PriceProvider__factory>("PriceProvider");
    const registry = externalAddressRegistry.forNetwork(await xhre.getNetwork());
    const config = await configOracle(xhre, registry);
    await exec(() => pp.setTokenOracle(config.token, config.oracle));
};

export const configSolidlyOracle = (
    token: keyof IExternalContractsRegistry,
    lp: string
) => {
    const config: IExtendedDeployFunction<IExodiaContractsRegistry> =
        configTokenOracleFactory(async (xhre, registry) => {
            const { contract: oracle } = await xhre.get<SolidlyTWAPOracle__factory>(
                "SolidlyTWAPOracle"
            );
            const tokenAddress = registry[token];
            await exec(() => oracle.setPair(tokenAddress, lp));
            return { token: tokenAddress, oracle: oracle.address };
        });
    config.dependencies = [PRICE_PROVIDER_DID, SOLIDLY_TWAP_ORACLE_DID];
    return config;
};

export const configChainlinkOracle = (
    token: keyof IExternalContractsRegistry,
    feed: string
) => {
    const config: IExtendedDeployFunction<IExodiaContractsRegistry> =
        configTokenOracleFactory(async (xhre, registry) => {
            const { contract: oracle } = await xhre.get<ChainlinkPriceOracle__factory>(
                "ChainlinkPriceOracle"
            );
            const tokenAddress = registry[token];
            await exec(() => oracle.setPriceFeed(tokenAddress, feed));
            return { token: tokenAddress, oracle: oracle.address };
        });
    config.dependencies = [PRICE_PROVIDER_DID, CHAINLINK_PRICE_ORACLE_DID];
    return config;
};
