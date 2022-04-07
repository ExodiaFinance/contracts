"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASSET_ALLOCATOR_DID = void 0;
const utils_1 = require("../packages/utils/utils");
const _37_deployAllocationCalculator_1 = require("./37_deployAllocationCalculator");
const _38_deployExodiaRoles_1 = require("./38_deployExodiaRoles");
const _39_deployTreasuryManager_1 = require("./39_deployTreasuryManager");
const _40_deployTreasuryDepositor_1 = require("./40_deployTreasuryDepositor");
exports.ASSET_ALLOCATOR_DID = "asset_allocator";
const deployAssetAllocator = async ({ deploy, get }) => {
    const { contract: allocCalc } = await get("AllocationCalculator");
    const { contract: roles } = await get("ExodiaRoles");
    const { contract: depositor } = await get("TreasuryDepositor");
    const { contract: assetAllocator, deployment } = await deploy("AssetAllocator", []);
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        await (0, utils_1.exec)(() =>
            assetAllocator.initialize(depositor.address, allocCalc.address, roles.address)
        );
        await (0, utils_1.exec)(() => depositor.addMachine(assetAllocator.address));
    }
    (0, utils_1.log)("Asset Allocator", assetAllocator.address);
};
exports.default = deployAssetAllocator;
deployAssetAllocator.id = exports.ASSET_ALLOCATOR_DID;
deployAssetAllocator.tags = ["local", "test", exports.ASSET_ALLOCATOR_DID];
deployAssetAllocator.dependencies = (0, utils_1.ifNotProd)([
    _37_deployAllocationCalculator_1.ALLOCATION_CALCULATOR_DID,
    _38_deployExodiaRoles_1.EXODIA_ROLES_DID,
    _39_deployTreasuryManager_1.TREASURY_MANAGER_DID,
    _40_deployTreasuryDepositor_1.TREASURY_DEPOSITOR_DID,
]);
