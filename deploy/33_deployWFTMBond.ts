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
    StakingHelperV2__factory,
} from "../packages/sdk/typechain";

import { OHM_DID } from "./01_deployOhm";
import { TREASURY_DID } from "./03_deployTreasury";
import { STAKING_HELPER_DID } from "./07_deployStakingHelper";
import { REDEEM_HELPER_DID } from "./10_deployRedeemHelper";

export const WFTM_BOND_DID = "wftm_bond";

const deployWFTMBond: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
    getNamedAccounts,
    getNetwork,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: ohm } = await get<OlympusERC20Token__factory>("OlympusERC20Token");
    const { contract: treasury } = await get<OlympusTreasury__factory>("OlympusTreasury");
    const { DAO, deployer } = await getNamedAccounts();
    const { WFTM, FTM_USD_FEED } = externalAddressRegistry.forNetwork(await getNetwork());
    const { contract: bond, deployment } = await deploy<BPTMNLTBondDepository__factory>(
        "wFTMBondDepository",
        [ohm.address, WFTM, treasury.address, DAO, FTM_USD_FEED]
    );
    if (deployment?.newlyDeployed) {
        const { contract: staking } = await get<StakingHelperV2__factory>(
            "StakingHelperV2"
        );
        await bond.setStaking(staking.address, true);
        const { contract: redeemHelper } = await get<RedeemHelper__factory>(
            "RedeemHelper"
        );
        if ((await redeemHelper.policy()) === deployer) {
            await redeemHelper.addBondContract(bond.address);
        }
    }
    log("wFTM Bond ", bond.address);
};
export default deployWFTMBond;
deployWFTMBond.id = WFTM_BOND_DID;
deployWFTMBond.tags = ["local", "test", WFTM_BOND_DID];
deployWFTMBond.dependencies = ifNotProd([
    TREASURY_DID,
    OHM_DID,
    REDEEM_HELPER_DID,
    STAKING_HELPER_DID,
]);
