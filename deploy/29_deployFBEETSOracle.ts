import { externalAddressRegistry } from "../packages/sdk/contracts";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../packages/utils/utils";
import { FBEETSPriceOracle__factory } from "../packages/sdk/typechain";

export const FBEETS_ORACLE_DID = "fbeets_oracle";

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
