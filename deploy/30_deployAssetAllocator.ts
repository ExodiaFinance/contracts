import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import toggleRights, { MANAGING } from "../src/subdeploy/toggleRights";
import { ifNotProd, log } from "../src/utils";
import {
    AllocationCalculator__factory,
    AssetAllocator__factory,
    OlympusTreasury__factory,
} from "../typechain";

import { TREASURY_DID } from "./03_deployTreasury";
import { ALLOCATION_CALCULATOR_DID } from "./37_deployAllocationCalculator";

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
    const { deployer } = await getNamedAccounts();
    const { contract: assetAllocator, deployment } =
        await deploy<AssetAllocator__factory>("AssetAllocator", [
            treasury.address,
            allocCalc.address,
        ]);
    if (deployment?.newlyDeployed) {
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
deployAssetAllocator.dependencies = ifNotProd([TREASURY_DID, ALLOCATION_CALCULATOR_DID]);
