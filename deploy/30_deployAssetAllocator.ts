import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import toggleRights, { MANAGING } from "../src/subdeploy/toggleRights";
import { ifNotProd, log, ZERO_ADDRESS } from "../src/utils";
import {
    AllocatedRiskFreeValue,
    AllocatedRiskFreeValue__factory,
    AllocationCalculator__factory,
    AssetAllocator__factory,
    ExodiaRoles__factory,
    OlympusTreasury__factory,
    TreasuryManager__factory,
} from "../typechain";

import { TREASURY_DID } from "./03_deployTreasury";
import { ARFV_TOKEN_DID } from "./31_deployARFVToken";
import { ALLOCATION_CALCULATOR_DID } from "./37_deployAllocationCalculator";
import { EXODIA_ROLES_DID } from "./38_deployExodiaRoles";
import { TREASURY_MANAGER_DID } from "./39_deployTreasuryManager";

export const ASSET_ALLOCATOR_DID = "asset_allocator";

const deployAssetAllocator: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
    getNamedAccounts,
    getNetwork,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: treasury } = await get<OlympusTreasury__factory>("OlympusTreasury");
    const { contract: allocCalc } = await get<AllocationCalculator__factory>(
        "AllocationCalculator"
    );
    const { contract: roles } = await get<ExodiaRoles__factory>("ExodiaRoles");
    const { contract: treasuryManager } = await get<TreasuryManager__factory>(
        "TreasuryManager"
    );
    const { deployer } = await getNamedAccounts();
    const { contract: assetAllocator, deployment } =
        await deploy<AssetAllocator__factory>("AssetAllocator", [
            treasury.address,
            treasuryManager.address,
            allocCalc.address,
            roles.address,
        ]);
    if (deployment?.newlyDeployed) {
        await treasuryManager.addMachine(assetAllocator.address);
        const { contract: arfv } = await get<AllocatedRiskFreeValue__factory>(
            "AllocatedRiskFreeValue"
        );
        await assetAllocator.setARFVToken(arfv.address);
        if ((await treasury.manager()) === deployer) {
            await toggleRights(treasury, MANAGING.RESERVEMANAGER, assetAllocator.address);
            await toggleRights(
                treasury,
                MANAGING.RESERVEDEPOSITOR,
                assetAllocator.address
            );
        }
    }
    log("Asset Allocator", assetAllocator.address);
};
export default deployAssetAllocator;
deployAssetAllocator.id = ASSET_ALLOCATOR_DID;
deployAssetAllocator.tags = ["local", "test", ASSET_ALLOCATOR_DID];
deployAssetAllocator.dependencies = ifNotProd([
    TREASURY_DID,
    ALLOCATION_CALCULATOR_DID,
    ARFV_TOKEN_DID,
    EXODIA_ROLES_DID,
    TREASURY_MANAGER_DID,
]);
