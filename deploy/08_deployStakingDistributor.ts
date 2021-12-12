import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import toggleRights, { MANAGING } from "../src/subdeploy/toggleRights";
import {
    Distributor__factory,
    OlympusERC20Token__factory,
    OlympusStaking__factory,
    OlympusTreasury__factory,
} from "../typechain";

import { OHM_DID } from "./01_deployOhm";
import { TREASURY_DID } from "./03_deployTreasury";
import { STAKING_DID, STAKING_EPOCH_LENGTH } from "./05_deployStaking";

export const STAKING_DISTRIBUTOR_DID = "distributor";

const deployDistributor: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: ohm } = await get<OlympusERC20Token__factory>("OlympusERC20Token");
    const { contract: staking } = await get<OlympusStaking__factory>("OlympusStaking");
    const { contract: treasury } = await get<OlympusTreasury__factory>("OlympusTreasury");
    const { contract: distributor, deployment } = await deploy<Distributor__factory>(
        "Distributor",
        [treasury.address, ohm.address, STAKING_EPOCH_LENGTH, STAKING_EPOCH_LENGTH]
    );
    if (deployment.newlyDeployed) {
        await staking.setContract(0, distributor.address);
    }
    if (!(await treasury.isRewardManager(distributor.address))) {
        toggleRights(treasury, MANAGING.REWARDMANAGER, distributor.address);
    }
    console.log("Distributor:", distributor.address);
};
export default deployDistributor;
deployDistributor.id = STAKING_DISTRIBUTOR_DID;
deployDistributor.tags = ["local", "test", STAKING_DISTRIBUTOR_DID, STAKING_DID];
deployDistributor.dependencies = [OHM_DID, TREASURY_DID];
deployDistributor.runAtTheEnd = true;
