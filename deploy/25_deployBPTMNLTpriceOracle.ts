import { externalAddressRegistry } from "../packages/sdk/contracts";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../packages/utils/utils";
import { BPTMNLTPriceOracle__factory } from "../packages/sdk/typechain";

export const BPTMNLT_ORACLE_DID = "bptmnlt_oracle_did";

const deployBPTMNLTPriceProvider: IExtendedDeployFunction<IExodiaContractsRegistry> =
    async ({ deploy, getNetwork }: IExtendedHRE<IExodiaContractsRegistry>) => {
        const { contract: oracle, deployment } =
            await deploy<BPTMNLTPriceOracle__factory>("BPTMNLTPriceOracle", []);
        const { BEETHOVEN_VAULT, THE_MONOLITH_POOLID, FTM_USD_FEED, DAI_USD_FEED } =
            externalAddressRegistry.forNetwork(await getNetwork());
        if (true || deployment?.newlyDeployed) {
            await oracle.setup(
                BEETHOVEN_VAULT,
                THE_MONOLITH_POOLID,
                [0, 4],
                [FTM_USD_FEED, DAI_USD_FEED]
            );
        }
        log("BPTMNLT oracle: ", oracle.address);
    };
export default deployBPTMNLTPriceProvider;
deployBPTMNLTPriceProvider.id = BPTMNLT_ORACLE_DID;
deployBPTMNLTPriceProvider.tags = ["local", "test", BPTMNLT_ORACLE_DID];
