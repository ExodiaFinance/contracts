import { externalAddressRegistry } from "../src/contracts";
import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../src/utils";
import { GOHMPriceOracle__factory } from "../typechain";

export const GOHM_ORACLE_DID = "gohm_oracle_did";

export const SPIRIT_ROUTER = "0x16327e3fbdaca3bcf7e38f5af2599d2ddc33ae52";
export const GOHM_ADDRESS = "0x91fa20244Fb509e8289CA630E5db3E9166233FDc";
export const USDC_ADDRESS = "0x04068da6c83afcfa0e13ba15a6696662335d5b75";
export const HEC_ADDRESS = "0x5C4FDfc5233f935f20D2aDbA572F770c2E377Ab0";

const deployDaiBond: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    getNetwork,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { OHM_INDEX_FEED, OHM_USD_FEED } = externalAddressRegistry.forNetwork(
        await getNetwork()
    );
    const { contract: oracle, deployment } = await deploy<GOHMPriceOracle__factory>(
        "GOHMPriceOracle",
        [OHM_USD_FEED, OHM_INDEX_FEED]
    );
    log("gOHM oracle: ", oracle.address);
};
export default deployDaiBond;
deployDaiBond.id = GOHM_ORACLE_DID;
deployDaiBond.tags = ["local", "test", GOHM_ORACLE_DID];
