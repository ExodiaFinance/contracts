import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import toggleRights, { MANAGING } from "../src/toggleRights";
import { DAI_DECIMALS, toWei } from "../src/utils";
import { DAI__factory, OlympusTreasury__factory } from "../typechain";

import { TREASURY_DID } from "./03_deployTreasury";
import { OHM_SET_VAULT_DID } from "./04_setVault";
import { MINT_DAI_DID } from "./15_mintDai";

export const MINT_OHM_DID = "mint_ohm_token";

const mintDai: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    get,
    getNamedAccounts,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { deployer } = await getNamedAccounts();
    const { contract: dai } = await get<DAI__factory>("DAI");
    const { contract: treasury } = await get<OlympusTreasury__factory>("OlympusTreasury");
    if (!(await treasury.isReserveDepositor(deployer))) {
        await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, deployer);
    }
    const amount = toWei(100, DAI_DECIMALS);
    await dai.approve(treasury.address, amount);
    await treasury.deposit(amount, dai.address, 0);
};
export default mintDai;

mintDai.id = MINT_OHM_DID;
mintDai.tags = ["local", "test", MINT_OHM_DID];
mintDai.dependencies = [MINT_DAI_DID, TREASURY_DID, OHM_SET_VAULT_DID];
