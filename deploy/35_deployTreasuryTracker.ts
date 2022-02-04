import { ContractTransaction } from "ethers";
import { externalAddressRegistry } from "../src/contracts";
import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import { exec, ifNotProd, log } from "../src/utils";
import { OlympusTreasury__factory, TreasuryTracker__factory } from "../typechain";

import { TREASURY_DID } from "./03_deployTreasury";

export const TREASURY_BALANCE_DID = "treasury_tracker";

const deployTreasuryBalance: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
    getNamedAccounts,
    getNetwork,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: treasury } = await get<OlympusTreasury__factory>("OlympusTreasury");
    const { DAO } = await getNamedAccounts();
    const {
        WFTM,
        GOHM,
        BEETS,
        FBEETS_BAR,
        MAI_TOKEN,
        THE_MONOLITH_POOL,
        EXODDAI_LP,
        EXODFTM_HLP,
        DAI,
    } = externalAddressRegistry.forNetwork(await getNetwork());
    const { contract: treasuryTracker, deployment } =
        await deploy<TreasuryTracker__factory>("TreasuryTracker", []);
    if (deployment?.newlyDeployed) {
        await exec(() => treasuryTracker.addContract(treasury.address));
        await exec(() => treasuryTracker.addEOA(DAO));
        await exec(() => treasuryTracker.addRiskFreeAsset(MAI_TOKEN));
        await exec(() => treasuryTracker.addRiskFreeAsset(DAI));
        await exec(() => treasuryTracker.addAssetWithRisk(WFTM));
        await exec(() => treasuryTracker.addAssetWithRisk(GOHM));
        await exec(() => treasuryTracker.addAssetWithRisk(BEETS));
        await exec(() => treasuryTracker.addBPT(FBEETS_BAR));
        await exec(() => treasuryTracker.addBPT(THE_MONOLITH_POOL));
        await exec(() => treasuryTracker.addUniLP(EXODDAI_LP));
        await exec(() => treasuryTracker.addUniLP(EXODFTM_HLP));
    }
    log("Treasury tracker ", treasuryTracker.address);
};

export default deployTreasuryBalance;
deployTreasuryBalance.id = TREASURY_BALANCE_DID;
deployTreasuryBalance.tags = ["local", "test", TREASURY_BALANCE_DID];
deployTreasuryBalance.dependencies = ifNotProd([TREASURY_DID]);
