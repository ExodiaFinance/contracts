import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { ifNotProd, log } from "../packages/utils/utils";
import {
    GOHMBondDepository__factory,
    GOHMPriceOracle__factory,
    OlympusERC20Token__factory,
    OlympusTreasury__factory,
    RedeemHelper__factory,
} from "../packages/sdk/typechain";
import { OHM_DID } from "./01_deployOhm";
import { TREASURY_DID } from "./03_deployTreasury";
import { REDEEM_HELPER_DID } from "./10_deployRedeemHelper";
import { GOHM_ADDRESS, GOHM_ORACLE_DID } from "./21_deployGOHMPriceOracle";

export const GOHM_BOND_DID = "gohm_bond";

const deployDaiBond: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
    getNamedAccounts,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { deployer } = await getNamedAccounts();
    const { contract: ohm } = await get<OlympusERC20Token__factory>("OlympusERC20Token");
    const { contract: treasury } = await get<OlympusTreasury__factory>("OlympusTreasury");
    const { DAO } = await getNamedAccounts();
    const { contract: feed } = await get<GOHMPriceOracle__factory>("GOHMPriceOracle");
    const { contract: bond, deployment } = await deploy<GOHMBondDepository__factory>(
        "GOHMBondDepository",
        [ohm.address, GOHM_ADDRESS, treasury.address, DAO, feed.address]
    );
    if (deployment?.newlyDeployed) {
        const { contract: redeemHelper } = await get<RedeemHelper__factory>(
            "RedeemHelper"
        );
        if ((await redeemHelper.policy()) === deployer) {
            await redeemHelper.addBondContract(bond.address);
        }
    }
    log("gOHM Bond ", bond.address);
};
export default deployDaiBond;
deployDaiBond.id = GOHM_BOND_DID;
deployDaiBond.tags = ["local", "test", GOHM_BOND_DID];
deployDaiBond.dependencies = ifNotProd([
    TREASURY_DID,
    OHM_DID,
    REDEEM_HELPER_DID,
    GOHM_ORACLE_DID,
]);
