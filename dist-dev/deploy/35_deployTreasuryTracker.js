"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TREASURY_BALANCE_DID = void 0;
const contracts_1 = require("../packages/sdk/contracts");
const utils_1 = require("../packages/utils/utils");
const _03_deployTreasury_1 = require("./03_deployTreasury");
exports.TREASURY_BALANCE_DID = "treasury_tracker";
const deployTreasuryBalance = async ({ deploy, get, getNamedAccounts, getNetwork }) => {
    const { contract: treasury } = await get("OlympusTreasury");
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
    } = contracts_1.externalAddressRegistry.forNetwork(await getNetwork());
    const { contract: treasuryTracker, deployment } = await deploy("TreasuryTracker", []);
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        await (0, utils_1.exec)(() => treasuryTracker.addContract(treasury.address));
        await (0, utils_1.exec)(() => treasuryTracker.addEOA(DAO));
        await (0, utils_1.exec)(() => treasuryTracker.addRiskFreeAsset(MAI));
        await (0, utils_1.exec)(() => treasuryTracker.addRiskFreeAsset(DAI));
        await (0, utils_1.exec)(() => treasuryTracker.addAssetWithRisk(WFTM));
        await (0, utils_1.exec)(() => treasuryTracker.addAssetWithRisk(GOHM));
        await (0, utils_1.exec)(() => treasuryTracker.addAssetWithRisk(BEETS));
        await (0, utils_1.exec)(() => treasuryTracker.addBPT(FBEETS_BAR));
        await (0, utils_1.exec)(() => treasuryTracker.addBPT(THE_MONOLITH_POOL));
        await (0, utils_1.exec)(() => treasuryTracker.addUniLP(EXODDAI_LP));
        await (0, utils_1.exec)(() => treasuryTracker.addUniLP(EXODFTM_HLP));
    }
    (0, utils_1.log)("Treasury tracker ", treasuryTracker.address);
};
exports.default = deployTreasuryBalance;
deployTreasuryBalance.id = exports.TREASURY_BALANCE_DID;
deployTreasuryBalance.tags = ["local", "test", exports.TREASURY_BALANCE_DID];
deployTreasuryBalance.dependencies = (0, utils_1.ifNotProd)([
    _03_deployTreasury_1.TREASURY_DID,
]);
