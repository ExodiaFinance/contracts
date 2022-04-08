import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { externalAddressRegistry } from "../packages/sdk/contracts";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import {
    BPTMNLTBondDepository__factory,
    OlympusERC20Token__factory,
    OlympusTreasury__factory,
    RedeemHelper__factory,
} from "../packages/sdk/typechain";
import { ifNotProd, log } from "../packages/utils/utils";

import { OHM_DID } from "./01_deployOhm";
import { TREASURY_DID } from "./03_deployTreasury";
import { REDEEM_HELPER_DID } from "./10_deployRedeemHelper";

export const BPTMNLT_BOND_DID = "bptmnlt_bond";

const deployDaiBond: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
    getNamedAccounts,
    getNetwork,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: ohm } = await get<OlympusERC20Token__factory>("OlympusERC20Token");
    const { contract: treasury } = await get<OlympusTreasury__factory>("OlympusTreasury");
    const { DAO, deployer } = await getNamedAccounts();
    const { THE_MONOLITH_POOL } = externalAddressRegistry.forNetwork(await getNetwork());
    const { contract: bond, deployment } = await deploy<BPTMNLTBondDepository__factory>(
        "BPTMNLTBondDepository",
        [
            ohm.address,
            THE_MONOLITH_POOL,
            treasury.address,
            DAO,
            "0x982a5A71C411f2eF748C91DC97D60C07E1016d4e",
        ]
    );
    if (deployment?.newlyDeployed) {
        const { contract: redeemHelper } = await get<RedeemHelper__factory>(
            "RedeemHelper"
        );
        if ((await redeemHelper.policy()) === deployer) {
            await redeemHelper.addBondContract(bond.address);
        }
    }
    log("BPTMNLT Bond ", bond.address);
};
export default deployDaiBond;
deployDaiBond.id = BPTMNLT_BOND_DID;
deployDaiBond.tags = ["local", "test", BPTMNLT_BOND_DID];
deployDaiBond.dependencies = [...ifNotProd([TREASURY_DID, OHM_DID, REDEEM_HELPER_DID])];
