import { externalAddressRegistry } from "../src/contracts";
import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../src/utils";
import { BPTMNLTPriceOracle__factory } from "../typechain";

export const BPTMNLT_ORACLE_DID = "bptmnlt_oracle_did";

const deployDaiBond: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    getNetwork,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: oracle, deployment } = await deploy<BPTMNLTPriceOracle__factory>(
        "BPTMNLTPriceOracle",
        []
    );
    const { BEETHOVEN_VAULT, THE_MONOLITH_POOLID, FTM_USD_FEED } =
        externalAddressRegistry.forNetwork(await getNetwork());
    if (deployment?.newlyDeployed) {
        await oracle.setup(BEETHOVEN_VAULT, THE_MONOLITH_POOLID, [0], [FTM_USD_FEED]);
    }
    log("BPTMNLT oracle: ", oracle.address);
};
export default deployDaiBond;
deployDaiBond.id = BPTMNLT_ORACLE_DID;
deployDaiBond.tags = ["local", "test", BPTMNLT_ORACLE_DID];
