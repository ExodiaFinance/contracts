import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { externalAddressRegistry } from "../packages/sdk";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import {
    ExodiaRoles__factory,
    MaiVaultAdapter__factory,
    TreasuryTracker__factory,
} from "../packages/sdk/typechain";
import { exec, ifNotProd, log } from "../packages/utils/utils";

import { TREASURY_BALANCE_DID } from "./35_deployTreasuryTracker";
import { EXODIA_ROLES_DID } from "./38_deployExodiaRoles";

export const MAI_VAULT_ADAPTER_DID = "mai_vault_adapter";

const deployMaiVaultAdapter: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
    getNetwork,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: adapter, deployment } = await deploy<MaiVaultAdapter__factory>(
        "MaiVaultAdapter",
        []
    );
    if (deployment?.newlyDeployed) {
        const { contract: roles } = await get<ExodiaRoles__factory>("ExodiaRoles");
        const FTM_VAULT = "0x1066b8FC999c1eE94241344818486D5f944331A0";
        const YEARN_FTM_VAULT = "0x7efB260662a6FA95c1CE1092c53Ca23733202798";
        const MOO_FTM_VAULT = "0x3609A304c6A41d87E895b9c1fd18c02ba989Ba90";
        const { WFTM } = externalAddressRegistry.forNetwork(await getNetwork());
        await exec(() => adapter.initialize(roles.address));
        await exec(() =>
            adapter.configVault(WFTM, FTM_VAULT, YEARN_FTM_VAULT, MOO_FTM_VAULT)
        );
        const { contract: treasuryTracker } = await get<TreasuryTracker__factory>(
            "TreasuryTracker"
        );
        await exec(() => treasuryTracker.addAdapter(adapter.address));
    }
    log("Mai Vault adapter", adapter.address);
};

export default deployMaiVaultAdapter;
deployMaiVaultAdapter.id = MAI_VAULT_ADAPTER_DID;
deployMaiVaultAdapter.tags = ["local", "test", MAI_VAULT_ADAPTER_DID];
deployMaiVaultAdapter.dependencies = ifNotProd([EXODIA_ROLES_DID, TREASURY_BALANCE_DID]);
