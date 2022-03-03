import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../packages/utils/utils";
import { OlympusERC20Token__factory } from "../packages/sdk/typechain";

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
