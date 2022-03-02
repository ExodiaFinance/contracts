import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { log, ZERO_ADDRESS } from "../packages/utils/utils";
import {
    DAI__factory,
    OlympusBondDepository__factory,
    OlympusERC20Token__factory,
    OlympusStaking__factory,
    OlympusTreasury__factory,
    RedeemHelper__factory,
    StakingHelperV2__factory,
} from "../packages/sdk/typechain";
import { DAI_DID } from "./00_deployDai";
import { OHM_DID } from "./01_deployOhm";
import { TREASURY_DID } from "./03_deployTreasury";
import { BONDING_CALCULATOR_DID } from "./09_deployOlympusBondingCalculator";
import { REDEEM_HELPER_DID } from "./10_deployRedeemHelper";

export const DAI_BOND_DID = "dai_bond";

const deployDaiBond: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
    getNamedAccounts,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: ohm } = await get<OlympusERC20Token__factory>("OlympusERC20Token");
    const { contract: dai } = await get<DAI__factory>("DAI");
    const { contract: treasury } = await get<OlympusTreasury__factory>("OlympusTreasury");
    const { DAO } = await getNamedAccounts();
    const { contract: bond, deployment } = await deploy<OlympusBondDepository__factory>(
        "DAIBondDepository",
        [ohm.address, dai.address, treasury.address, DAO, ZERO_ADDRESS]
    );
    await bond.initializeBondTerms(100, 1000, 0, 100000000, 0, "10000000000000000", 0);
    /*    if (deployment?.newlyDeployed) {
        const { contract: redeemHelper } = await get<RedeemHelper__factory>(
            "RedeemHelper"
        );
        await redeemHelper.addBondContract(bond.address);
    }*/
    log("DAI Bond ", bond.address);
};
export default deployDaiBond;
deployDaiBond.id = DAI_BOND_DID;
deployDaiBond.tags = ["local", "test", DAI_BOND_DID];
deployDaiBond.dependencies = [DAI_DID, TREASURY_DID, OHM_DID, REDEEM_HELPER_DID];
