import { externalAddressRegistry } from "../packages/sdk/contracts";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { ifNotProd, log } from "../packages/utils/utils";
import {
    BPTMNLTBondDepository__factory,
    FBEETSPriceOracle__factory,
    OlympusERC20Token__factory,
    OlympusTreasury__factory,
    RedeemHelper__factory,
} from "../packages/sdk/typechain";

import { OHM_DID } from "./01_deployOhm";
import { TREASURY_DID } from "./03_deployTreasury";
import { REDEEM_HELPER_DID } from "./10_deployRedeemHelper";
import { FBEETS_ORACLE_DID } from "./29_deployFBEETSOracle";

export const FBEETS_BOND_DID = "fbeets_bond";

const deployFBEETSbond: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
    getNamedAccounts,
    getNetwork,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: ohm } = await get<OlympusERC20Token__factory>("OlympusERC20Token");
    const { contract: treasury } = await get<OlympusTreasury__factory>("OlympusTreasury");
    const { DAO, deployer } = await getNamedAccounts();
    const { contract: feed } = await get<FBEETSPriceOracle__factory>("fBEETSPriceOracle");
    const { FBEETS_BAR } = externalAddressRegistry.forNetwork(await getNetwork());
    const { contract: bond, deployment } = await deploy<BPTMNLTBondDepository__factory>(
        "fBEETSBondDepository",
        [ohm.address, FBEETS_BAR, treasury.address, DAO, feed.address]
    );
    if (deployment?.newlyDeployed) {
        const { contract: redeemHelper } = await get<RedeemHelper__factory>(
            "RedeemHelper"
        );
        if ((await redeemHelper.policy()) === deployer) {
            await redeemHelper.addBondContract(bond.address);
        }
    }
    log("fBEETS Bond ", bond.address);
};
export default deployFBEETSbond;
deployFBEETSbond.id = FBEETS_BOND_DID;
deployFBEETSbond.tags = ["local", "test", FBEETS_BOND_DID];
deployFBEETSbond.dependencies = ifNotProd([
    TREASURY_DID,
    OHM_DID,
    REDEEM_HELPER_DID,
    FBEETS_ORACLE_DID,
]);
