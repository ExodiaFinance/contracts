import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import { zeroAddress } from "../src/subdeploy/deployBasics";
import { ifNotProd, log } from "../src/utils";
import {
    DAI__factory,
    GOHMBondDepository__factory,
    GOHMSpotPriceOracle__factory,
    OlympusBondDepository__factory,
    OlympusERC20Token__factory,
    OlympusStaking__factory,
    OlympusTreasury__factory,
    RedeemHelper__factory,
    StakingHelperV2__factory,
} from "../typechain";
import { OHM_DID } from "./01_deployOhm";
import { TREASURY_DID } from "./03_deployTreasury";
import { REDEEM_HELPER_DID } from "./10_deployRedeemHelper";
import { GOHM_ADDRESS, GOHM_ORACLE_DID } from "./21_deployGOHMSpotPriceOracle";

export const GOHM_BOND_DID = "gohm_bond";

const deployDaiBond: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
    getNamedAccounts,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: ohm } = await get<OlympusERC20Token__factory>("OlympusERC20Token");
    const { contract: treasury } = await get<OlympusTreasury__factory>("OlympusTreasury");
    const { DAO } = await getNamedAccounts();
    const { contract: feed } = await get<GOHMSpotPriceOracle__factory>(
        "GOHMSpotPriceOracle"
    );
    const { contract: bond, deployment } = await deploy<GOHMBondDepository__factory>(
        "GOHMBondDepository",
        [ohm.address, GOHM_ADDRESS, treasury.address, DAO, feed.address]
    );
    /*    if (deployment?.newlyDeployed) {
        const { contract: redeemHelper } = await get<RedeemHelper__factory>(
            "RedeemHelper"
        );
        await redeemHelper.addBondContract(bond.address);
    }*/
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
