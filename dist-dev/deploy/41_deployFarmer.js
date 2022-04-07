"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FARMER_DID = void 0;
const utils_1 = require("../packages/utils/utils");
const _30_deployAssetAllocator_1 = require("./30_deployAssetAllocator");
const _38_deployExodiaRoles_1 = require("./38_deployExodiaRoles");
const _39_deployTreasuryManager_1 = require("./39_deployTreasuryManager");
const _40_deployTreasuryDepositor_1 = require("./40_deployTreasuryDepositor");
exports.FARMER_DID = "farmer_did";
const deployTreasuryDepositor = async ({ deploy, get, getNamedAccounts }) => {
    const { contract: allocator } = await get("AssetAllocator");
    const { contract: manager } = await get("TreasuryManager");
    const { contract: depositor } = await get("TreasuryDepositor");
    const { contract: roles } = await get("ExodiaRoles");
    const { contract: farmer, deployment } = await deploy("Farmer", []);
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        await (0, utils_1.exec)(() =>
            farmer.initialize(
                allocator.address,
                manager.address,
                depositor.address,
                roles.address
            )
        );
        await (0, utils_1.exec)(() => allocator.addMachine(farmer.address));
        await (0, utils_1.exec)(() => manager.addMachine(farmer.address));
        await (0, utils_1.exec)(() => depositor.addMachine(farmer.address));
    }
    (0, utils_1.log)("Farmer: ", farmer.address);
};
exports.default = deployTreasuryDepositor;
deployTreasuryDepositor.id = exports.FARMER_DID;
deployTreasuryDepositor.tags = ["local", "test", exports.FARMER_DID];
deployTreasuryDepositor.dependencies = [
    _40_deployTreasuryDepositor_1.TREASURY_DEPOSITOR_DID,
    _39_deployTreasuryManager_1.TREASURY_MANAGER_DID,
    _30_deployAssetAllocator_1.ASSET_ALLOCATOR_DID,
    _38_deployExodiaRoles_1.EXODIA_ROLES_DID,
];
