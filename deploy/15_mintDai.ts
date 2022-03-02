import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { DAI_DECIMALS, toWei } from "../packages/utils/utils";
import { DAI__factory } from "../packages/sdk/typechain";

import { DAI_DID } from "./00_deployDai";

export const MINT_DAI_DID = "mint_dai_token";

const mintDai: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    get,
    getNamedAccounts,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { deployer } = await getNamedAccounts();
    const { contract: dai } = await get<DAI__factory>("DAI");
    await dai.mint(deployer, toWei(100, DAI_DECIMALS));
};
export default mintDai;
mintDai.id = MINT_DAI_DID;
mintDai.tags = ["local", "test", MINT_DAI_DID];
mintDai.dependencies = [DAI_DID];
