import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import toggleRights, { MANAGING } from "../packages/utils/toggleRights";
import { ifNotProd, log, ZERO_ADDRESS } from "../packages/utils/utils";
import {
    AllocatedRiskFreeValue,
    AllocatedRiskFreeValue__factory,
    AllocationCalculator__factory,
    AssetAllocator__factory,
    ExodiaRoles__factory,
    OlympusTreasury__factory,
    TreasuryManager__factory,
} from "../packages/sdk/typechain";

import { TREASURY_DID } from "./03_deployTreasury";
import { ARFV_TOKEN_DID } from "./31_deployARFVToken";
import { ALLOCATION_CALCULATOR_DID } from "./37_deployAllocationCalculator";
import { EXODIA_ROLES_DID } from "./38_deployExodiaRoles";
import { TREASURY_MANAGER_DID } from "./39_deployTreasuryManager";
import { TREASURY_DEPOSITOR_DID } from "./40_deployTreasuryDepositor";

export const ASSET_ALLOCATOR_DID = "asset_allocator";

const deployAssetAllocator: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
    getNamedAccounts,
    getNetwork,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: allocCalc } = await get<AllocationCalculator__factory>(
        "AllocationCalculator"
    );
    const { contract: roles } = await get<ExodiaRoles__factory>("ExodiaRoles");
    const { contract: depositor } = await get<TreasuryManager__factory>(
        "TreasuryDepositor"
    );
    const { contract: assetAllocator, deployment } =
        await deploy<AssetAllocator__factory>("AssetAllocator", [
            depositor.address,
            allocCalc.address,
            roles.address,
        ]);
    if (deployment?.newlyDeployed) {
        await depositor.addMachine(assetAllocator.address);
    }
    log("Asset Allocator", assetAllocator.address);
};
export default deployAssetAllocator;
deployAssetAllocator.id = ASSET_ALLOCATOR_DID;
deployAssetAllocator.tags = ["local", "test", ASSET_ALLOCATOR_DID];
deployAssetAllocator.dependencies = ifNotProd([
    ALLOCATION_CALCULATOR_DID,
    EXODIA_ROLES_DID,
    TREASURY_MANAGER_DID,
    TREASURY_DEPOSITOR_DID,
]);
