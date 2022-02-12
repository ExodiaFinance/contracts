import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import toggleRights, { MANAGING } from "../src/subdeploy/toggleRights";
import { log } from "../src/utils";
import {
    AllocatedRiskFreeValue__factory,
    ExodiaRoles__factory,
    OlympusTreasury__factory,
    TreasuryManager__factory,
} from "../typechain";
import { TREASURY_DID } from "./03_deployTreasury";
import { ARFV_TOKEN_DID } from "./31_deployARFVToken";
import { EXODIA_ROLES_DID } from "./38_deployExodiaRoles";

export const TREASURY_MANAGER_DID = "asset_manager";

const deployAssetManager: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
    getNamedAccounts,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: treasury } = await get<OlympusTreasury__factory>("OlympusTreasury");
    const { contract: arfv } = await get<AllocatedRiskFreeValue__factory>(
        "AllocatedRiskFreeValue"
    );
    const { contract: roles } = await get<ExodiaRoles__factory>("ExodiaRoles");
    const { contract: manager, deployment } = await deploy<TreasuryManager__factory>(
        "TreasuryManager",
        [treasury.address, arfv.address, roles.address]
    );
    if (deployment?.newlyDeployed) {
        await toggleRights(treasury, MANAGING.RESERVEMANAGER, manager.address);
        await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, manager.address);
        await toggleRights(treasury, MANAGING.LIQUIDITYMANAGER, manager.address);
        await arfv.addMinter(manager.address);
    }
    log("Treasury Manager: ", manager.address);
};
export default deployAssetManager;
deployAssetManager.id = TREASURY_MANAGER_DID;
deployAssetManager.tags = ["local", "test", TREASURY_MANAGER_DID];
deployAssetManager.dependencies = [ARFV_TOKEN_DID, TREASURY_DID, EXODIA_ROLES_DID];
