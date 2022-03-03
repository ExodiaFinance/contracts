import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import toggleRights, { MANAGING } from "../packages/utils/toggleRights";
import { ifNotProd } from "../packages/utils/utils";
import {
    DAI__factory,
    OlympusBondDepository__factory,
    OlympusBondingCalculator__factory,
    OlympusERC20Token__factory,
    OlympusTreasury__factory,
    RemoveUniLp__factory,
} from "../packages/sdk/typechain";

import { TREASURY_DID } from "./03_deployTreasury";

export const DEPLOY_REMOVE_UNI_LP_STRATEGY_DID = "remove_uni_lp_strategy";

const deployUniLpStrategy: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    get,
    deploy,
    getNamedAccounts,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { deployer } = await getNamedAccounts();
    const { contract: treasury } = await get<OlympusTreasury__factory>("OlympusTreasury");
    const { contract: removeUniLP } = await deploy<RemoveUniLp__factory>("RemoveUniLp", [
        treasury.address,
    ]);
    if ((await treasury.manager()) === deployer) {
        if (!(await treasury.isReserveDepositor(removeUniLP.address))) {
            await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, removeUniLP.address);
        }
        if (!(await treasury.isLiquidityManager(removeUniLP.address))) {
            await toggleRights(treasury, MANAGING.LIQUIDITYMANAGER, removeUniLP.address);
        }
    }
};
export default deployUniLpStrategy;

deployUniLpStrategy.id = DEPLOY_REMOVE_UNI_LP_STRATEGY_DID;
deployUniLpStrategy.tags = ["local", "test", DEPLOY_REMOVE_UNI_LP_STRATEGY_DID];
deployUniLpStrategy.dependencies = ifNotProd([TREASURY_DID]);
