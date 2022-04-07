import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { externalAddressRegistry } from "../packages/sdk/contracts";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import {
    OlympusTreasury__factory,
    TreasuryTracker__factory,
} from "../packages/sdk/typechain";
import { exec, ifNotProd, log } from "../packages/utils/utils";

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
        MAI,
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
        await exec(() => treasuryTracker.addRiskFreeAsset(MAI));
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
