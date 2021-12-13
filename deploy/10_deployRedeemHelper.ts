import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../src/utils";
import { OlympusERC20Token__factory } from "../typechain";

export const REDEEM_HELPER_DID = "redeem_helper";

const deployRedeemHelper: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract } = await deploy<OlympusERC20Token__factory>("RedeemHelper", []);
    log("RedeemHelper ", contract.address);
};
export default deployRedeemHelper;
deployRedeemHelper.id = REDEEM_HELPER_DID;
deployRedeemHelper.tags = ["local", "test"];
