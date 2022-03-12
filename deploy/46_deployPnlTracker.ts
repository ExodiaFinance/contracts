import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import {
    ExodiaRoles__factory,
    PNLTracker__factory,
    TreasuryTracker__factory,
} from "../packages/sdk/typechain";
import { exec, log } from "../packages/utils/utils";

export const PNLTRACKER_DID = "pnl_tracker";

const deployPnlTracker: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
    getNetwork,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: pnlTracker, deployment } = await deploy<PNLTracker__factory>(
        "PNLTracker",
        []
    );
    if (deployment?.newlyDeployed) {
        const { contract: roles } = await get<ExodiaRoles__factory>("ExodiaRoles");
        await exec(() => pnlTracker.initialize(roles.address));
    }
    log("PNL tracker", pnlTracker.address);
};
export default deployPnlTracker;
deployPnlTracker.id = PNLTRACKER_DID;
deployPnlTracker.tags = ["local", "test", PNLTRACKER_DID];
