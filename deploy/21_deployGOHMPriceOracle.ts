import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { externalAddressRegistry } from "../packages/sdk/contracts";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { GOHMPriceOracle__factory } from "../packages/sdk/typechain";
import { log } from "../packages/utils/utils";

export const GOHM_ORACLE_DID = "gohm_oracle_did";

export const GOHM_ADDRESS = "0x91fa20244Fb509e8289CA630E5db3E9166233FDc";
export const USDC_ADDRESS = "0x04068da6c83afcfa0e13ba15a6696662335d5b75";

const deployDaiBond: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    getNetwork,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { OHM_INDEX_FEED, OHM_USD_FEED, FTM_USD_FEED } =
        externalAddressRegistry.forNetwork(await getNetwork());
    const { contract: oracle, deployment } = await deploy<GOHMPriceOracle__factory>(
        "GOHMPriceOracle",
        [OHM_USD_FEED, OHM_INDEX_FEED, FTM_USD_FEED]
    );
    log("gOHM oracle: ", oracle.address);
};
export default deployDaiBond;
deployDaiBond.id = GOHM_ORACLE_DID;
deployDaiBond.tags = ["local", "test", GOHM_ORACLE_DID];
