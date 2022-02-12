import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import toggleRights, { MANAGING } from "../src/subdeploy/toggleRights";
import { exec, ifNotProd, log } from "../src/utils";
import {
    AllocatedRiskFreeValue__factory,
    AssetAllocator__factory,
    OlympusTreasury__factory,
} from "../typechain";

import { TREASURY_DID } from "./03_deployTreasury";
import { ASSET_ALLOCATOR_DID } from "./30_deployAssetAllocator";

export const ARFV_TOKEN_DID = "arfv_token";

const deployARFVToken: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
    getNamedAccounts,
    getNetwork,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: treasury } = await get<OlympusTreasury__factory>("OlympusTreasury");
    const { contract: assetAllocator } = await get<AssetAllocator__factory>(
        "AssetAllocator"
    );
    const { deployer } = await getNamedAccounts();
    const { contract: arfv, deployment } = await deploy<AllocatedRiskFreeValue__factory>(
        "AllocatedRiskFreeValue",
        []
    );
    if (deployment?.newlyDeployed) {
        await exec(() => arfv.addMinter(assetAllocator.address));
        if ((await treasury.manager()) === deployer) {
            await toggleRights(treasury, MANAGING.RESERVETOKEN, arfv.address);
        }
        if (await assetAllocator.isArchitect(deployer)) {
            await assetAllocator.setARFVToken(arfv.address);
        }
    }
    log("ARFV token", arfv.address);
};
export default deployARFVToken;
deployARFVToken.id = ARFV_TOKEN_DID;
deployARFVToken.tags = ["local", "test", ARFV_TOKEN_DID];
deployARFVToken.dependencies = []; // ifNotProd([TREASURY_DID, ASSET_ALLOCATOR_DID]);
