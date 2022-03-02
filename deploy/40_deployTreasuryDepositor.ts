import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import toggleRights, { MANAGING } from "../packages/utils/toggleRights";
import { log } from "../packages/utils/utils";
import {
    AllocatedRiskFreeValue__factory,
    ExodiaRoles__factory,
    OlympusTreasury__factory,
    TreasuryDepositor__factory,
} from "../packages/sdk/typechain";

import { TREASURY_DID } from "./03_deployTreasury";
import { ARFV_TOKEN_DID } from "./31_deployARFVToken";
import { EXODIA_ROLES_DID } from "./38_deployExodiaRoles";

export const TREASURY_DEPOSITOR_DID = "treasury_depositor";

const deployTreasuryDepositor: IExtendedDeployFunction<IExodiaContractsRegistry> =
    async ({ deploy, get, getNamedAccounts }: IExtendedHRE<IExodiaContractsRegistry>) => {
        const { contract: treasury } = await get<OlympusTreasury__factory>(
            "OlympusTreasury"
        );
        const { contract: arfv } = await get<AllocatedRiskFreeValue__factory>(
            "AllocatedRiskFreeValue"
        );
        const { contract: roles } = await get<ExodiaRoles__factory>("ExodiaRoles");
        const { contract: depositor, deployment } =
            await deploy<TreasuryDepositor__factory>("TreasuryDepositor", [
                treasury.address,
                arfv.address,
                roles.address,
            ]);
        if (deployment?.newlyDeployed) {
            await toggleRights(treasury, MANAGING.RESERVEMANAGER, depositor.address);
            await toggleRights(treasury, MANAGING.LIQUIDITYDEPOSITOR, depositor.address);
            await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, depositor.address);
            await arfv.addMinter(depositor.address);
        }
        log("Treasury Depositor: ", depositor.address);
    };
export default deployTreasuryDepositor;
deployTreasuryDepositor.id = TREASURY_DEPOSITOR_DID;
deployTreasuryDepositor.tags = ["local", "test", TREASURY_DEPOSITOR_DID];
deployTreasuryDepositor.dependencies = [ARFV_TOKEN_DID, TREASURY_DID, EXODIA_ROLES_DID];
