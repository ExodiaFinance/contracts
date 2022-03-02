import { externalAddressRegistry } from "../packages/sdk/contracts";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../packages/utils/utils";
import { MasterLock__factory } from "../packages/sdk/typechain";

export const FNFT_MASTER_LOCK_DID = "liquid_lock_staking";

const deployFNFTMasterLock: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    getNetwork,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { REVEST_REGISTRY } = externalAddressRegistry.forNetwork(await getNetwork());
    const { contract: masterLock } = await deploy<MasterLock__factory>("MasterLock", [
        REVEST_REGISTRY,
    ]);
    log("MasterLock:", masterLock.address);
};

export default deployFNFTMasterLock;
deployFNFTMasterLock.id = FNFT_MASTER_LOCK_DID;
deployFNFTMasterLock.tags = ["local", "test", FNFT_MASTER_LOCK_DID];
