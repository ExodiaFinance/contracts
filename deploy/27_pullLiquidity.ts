import { externalAddressRegistry } from "../src/contracts";
import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import toggleRights, { MANAGING } from "../src/toggleRights";
import { ifNotProd } from "../src/utils";
import { OlympusTreasury__factory, RemoveUniLp__factory } from "../typechain";

import { TREASURY_DID } from "./03_deployTreasury";
import { DEPLOY_REMOVE_UNI_LP_STRATEGY_DID } from "./20_deployRemoveUniLPStrategy";

export const PULL_LIQUIDITY_DID = "pull_liquidity";

const removeLp: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    get,
    deploy,
    getNamedAccounts,
    getNetwork,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { deployer } = await getNamedAccounts();
    const { SPOOKY_ROUTER, EXODDAI_LP } = externalAddressRegistry.forNetwork(
        await getNetwork()
    );
    const { contract: removeUniLP } = await get<RemoveUniLp__factory>("RemoveUniLp");
    await removeUniLP.remove(SPOOKY_ROUTER, EXODDAI_LP);
};
export default removeLp;

removeLp.id = PULL_LIQUIDITY_DID;
removeLp.tags = ["local", "test", PULL_LIQUIDITY_DID];
removeLp.dependencies = ifNotProd([DEPLOY_REMOVE_UNI_LP_STRATEGY_DID]);
