import { externalAddressRegistry } from "../src/contracts";
import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../src/utils";
import { MasterLock__factory } from "../typechain";

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
