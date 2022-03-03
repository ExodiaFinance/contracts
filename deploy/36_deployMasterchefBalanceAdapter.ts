import { externalAddressRegistry } from "../packages/sdk/contracts";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { exec, log } from "../packages/utils/utils";
import {
    MasterchefBalanceAdapter__factory,
    TreasuryTracker__factory,
} from "../packages/sdk/typechain";

export const MASTERCHEF_BALANCE_ADAPTER_DID = "masterchef_balance";

const deployMasterchefBalanceAdapter: IExtendedDeployFunction<IExodiaContractsRegistry> =
    async ({ deploy, getNetwork, get }: IExtendedHRE<IExodiaContractsRegistry>) => {
        const { THE_MONOLITH_POOL, BEETS_MASTERCHEF, FBEETS_BAR, DEMETER_DEGREE } =
            externalAddressRegistry.forNetwork(await getNetwork());
        const { contract: adapter, deployment } =
            await deploy<MasterchefBalanceAdapter__factory>(
                "MasterchefBalanceAdapter",
                []
            );
        if (deployment?.newlyDeployed) {
            const treasuryTracker = await get<TreasuryTracker__factory>(
                "TreasuryTracker"
            );
            await exec(() => treasuryTracker.contract.addAdapter(adapter.address));
            await exec(() =>
                adapter.addFarm(THE_MONOLITH_POOL, {
                    contractAddress: BEETS_MASTERCHEF,
                    pid: 37,
                })
            );
            await exec(() =>
                adapter.addFarm(FBEETS_BAR, {
                    contractAddress: BEETS_MASTERCHEF,
                    pid: 22,
                })
            );
            await exec(() =>
                adapter.addFarm(DEMETER_DEGREE, {
                    contractAddress: BEETS_MASTERCHEF,
                    pid: 40,
                })
            );
        }
        log("MasterchefBalanceAdapter ", adapter.address);
    };
export default deployMasterchefBalanceAdapter;
deployMasterchefBalanceAdapter.id = MASTERCHEF_BALANCE_ADAPTER_DID;
deployMasterchefBalanceAdapter.tags = ["local", "test", MASTERCHEF_BALANCE_ADAPTER_DID];
