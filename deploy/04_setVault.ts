import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../packages/utils/utils";
import {
    OlympusERC20Token__factory,
    OlympusTreasury__factory,
} from "../packages/sdk/typechain";
import { OHM_DID } from "./01_deployOhm";

import { SOHM_DID } from "./02_deploysOhm";
import { TREASURY_DID } from "./03_deployTreasury";

export const OHM_SET_VAULT_DID = "ohm_set_vault";

const ohmSetVault: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    get,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: ohm } = await get<OlympusERC20Token__factory>("OlympusERC20Token");
    const { contract: treasury } = await get<OlympusTreasury__factory>("OlympusTreasury");
    const ohmVault = await ohm.vault();
    if (ohmVault !== treasury.address) {
        await ohm.setVault(treasury.address);
        log("Updated OHM vault", ohmVault, "->", treasury.address);
    }
};
export default ohmSetVault;
ohmSetVault.id = OHM_SET_VAULT_DID;
ohmSetVault.tags = ["local", "test", TREASURY_DID];
ohmSetVault.dependencies = [OHM_DID, OHM_SET_VAULT_DID];
