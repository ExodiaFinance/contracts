import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import toggleRights, { MANAGING } from "../packages/utils/toggleRights";
import { log } from "../packages/utils/utils";
import {
    AssetAllocator__factory,
    ExodiaRoles__factory,
    Farmer__factory,
    TreasuryDepositor__factory,
    TreasuryManager__factory,
} from "../packages/sdk/typechain";

import { ASSET_ALLOCATOR_DID } from "./30_deployAssetAllocator";
import { EXODIA_ROLES_DID } from "./38_deployExodiaRoles";
import { TREASURY_MANAGER_DID } from "./39_deployTreasuryManager";
import { TREASURY_DEPOSITOR_DID } from "./40_deployTreasuryDepositor";

export const FARMER_DID = "farmer_did";

const deployTreasuryDepositor: IExtendedDeployFunction<IExodiaContractsRegistry> =
    async ({ deploy, get, getNamedAccounts }: IExtendedHRE<IExodiaContractsRegistry>) => {
        const { contract: allocator } = await get<AssetAllocator__factory>(
            "AssetAllocator"
        );
        const { contract: manager } = await get<TreasuryManager__factory>(
            "TreasuryManager"
        );
        const { contract: depositor } = await get<TreasuryDepositor__factory>(
            "TreasuryDepositor"
        );
        const { contract: roles } = await get<ExodiaRoles__factory>("ExodiaRoles");
        const { contract: farmer, deployment } = await deploy<Farmer__factory>("Farmer", [
            allocator.address,
            manager.address,
            depositor.address,
            roles.address,
        ]);
        log("Farmer: ", farmer.address);
    };

export default deployTreasuryDepositor;

deployTreasuryDepositor.id = FARMER_DID;
deployTreasuryDepositor.tags = ["local", "test", FARMER_DID];
deployTreasuryDepositor.dependencies = [
    TREASURY_DEPOSITOR_DID,
    TREASURY_MANAGER_DID,
    ASSET_ALLOCATOR_DID,
    EXODIA_ROLES_DID,
];
