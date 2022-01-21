import { externalAddressRegistry } from "../src/contracts";
import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../src/utils";
import { FBEETSPriceOracle__factory } from "../typechain";

export const FBEETS_ORACLE_DID = "bptmnlt_bond";

const deployfBeetsBonds: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    getNetwork,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { FIDELIO_DUETTO, FTM_USD_FEED, FBEETS_BAR } =
        externalAddressRegistry.forNetwork(await getNetwork());
    const { contract: bond } = await deploy<FBEETSPriceOracle__factory>(
        "fBEETSPriceOracle",
        [FIDELIO_DUETTO, FTM_USD_FEED, FBEETS_BAR]
    );
    log("fBeets oracle", bond.address);
};
export default deployfBeetsBonds;
deployfBeetsBonds.id = FBEETS_ORACLE_DID;
deployfBeetsBonds.tags = ["local", "test", FBEETS_ORACLE_DID];
