import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import toggleRights, { MANAGING } from "../packages/utils/toggleRights";
import {
    DAI__factory,
    OlympusBondDepository__factory,
    OlympusTreasury__factory,
} from "../packages/sdk/typechain";

import { DAI_DID } from "./00_deployDai";
import { TREASURY_DID } from "./03_deployTreasury";
import { DAI_BOND_DID } from "./11_deployDaiBond";

export const ALLOW_DAI_BOND_TREASURY = "allow_dai_bond_treasury";

const allowDaiBondsTreasury: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    get,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: dai } = await get<DAI__factory>("DAI");
    const { contract: treasury } = await get<OlympusTreasury__factory>("OlympusTreasury");
    const { contract: bond } = await get<OlympusBondDepository__factory>(
        "DAIBondDepository"
    );

    if (!(await treasury.isReserveDepositor(bond.address))) {
        await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, bond.address);
    }
    if (!(await treasury.isReserveDepositor(dai.address))) {
        await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, dai.address);
    }
};
export default allowDaiBondsTreasury;
allowDaiBondsTreasury.id = ALLOW_DAI_BOND_TREASURY;
allowDaiBondsTreasury.tags = ["local", "test", ALLOW_DAI_BOND_TREASURY];
allowDaiBondsTreasury.dependencies = [TREASURY_DID, DAI_BOND_DID, DAI_DID];
