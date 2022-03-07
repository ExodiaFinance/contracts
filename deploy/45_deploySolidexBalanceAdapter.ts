import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { externalAddressRegistry } from "../packages/sdk";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import {
    SolidexBalanceAdapter__factory,
    TreasuryTracker__factory,
} from "../packages/sdk/typechain";
import { exec, log } from "../packages/utils/utils";

import { TREASURY_BALANCE_DID } from "./35_deployTreasuryTracker";

export const SOLIDEX_BALANCE_ADAPTER_DID = "solidex_balance_adapter";

const deploySexAdapter: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
    getNetwork,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { SOLIDEX_LP_DEPOSITOR } = externalAddressRegistry.forNetwork(
        await getNetwork()
    );
    const { contract: sexAdapter, deployment } =
        await deploy<SolidexBalanceAdapter__factory>("SolidexBalanceAdapter", [
            SOLIDEX_LP_DEPOSITOR,
        ]);
    if (deployment?.newlyDeployed) {
        const { contract: tracker } = await get<TreasuryTracker__factory>(
            "TreasuryTracker"
        );
        await exec(() => tracker.addAdapter(sexAdapter.address));
    }
    log("Solidex balance adapter", sexAdapter.address);
};
export default deploySexAdapter;
deploySexAdapter.id = SOLIDEX_BALANCE_ADAPTER_DID;
deploySexAdapter.tags = ["local", "test", SOLIDEX_BALANCE_ADAPTER_DID];
