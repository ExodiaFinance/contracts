"use strict";
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              Object.defineProperty(o, k2, {
                  enumerable: true,
                  get: function () {
                      return m[k];
                  },
              });
          }
        : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              o[k2] = m[k];
          });
var __setModuleDefault =
    (this && this.__setModuleDefault) ||
    (Object.create
        ? function (o, v) {
              Object.defineProperty(o, "default", { enumerable: true, value: v });
          }
        : function (o, v) {
              o["default"] = v;
          });
var __importStar =
    (this && this.__importStar) ||
    function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
                    __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.TREASURY_MANAGER_DID = void 0;
const toggleRights_1 = __importStar(require("../packages/utils/toggleRights"));
const utils_1 = require("../packages/utils/utils");
const _03_deployTreasury_1 = require("./03_deployTreasury");
const _31_deployARFVToken_1 = require("./31_deployARFVToken");
const _38_deployExodiaRoles_1 = require("./38_deployExodiaRoles");
exports.TREASURY_MANAGER_DID = "asset_manager";
const deployAssetManager = async ({ deploy, get, getNamedAccounts }) => {
    const { contract: treasury } = await get("OlympusTreasury");
    const { contract: arfv } = await get("AllocatedRiskFreeValue");
    const { contract: roles } = await get("ExodiaRoles");
    const { contract: manager, deployment } = await deploy("TreasuryManager", []);
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        await (0, utils_1.exec)(() =>
            manager.initialize(treasury.address, arfv.address, roles.address)
        );
        await (0, utils_1.exec)(() =>
            (0, toggleRights_1.default)(
                treasury,
                toggleRights_1.MANAGING.RESERVEMANAGER,
                manager.address
            )
        );
        await (0, utils_1.exec)(() =>
            (0, toggleRights_1.default)(
                treasury,
                toggleRights_1.MANAGING.RESERVEDEPOSITOR,
                manager.address
            )
        );
        await (0, utils_1.exec)(() =>
            (0, toggleRights_1.default)(
                treasury,
                toggleRights_1.MANAGING.LIQUIDITYMANAGER,
                manager.address
            )
        );
        await (0, utils_1.exec)(() => arfv.addMinter(manager.address));
    }
    (0, utils_1.log)("Treasury Manager: ", manager.address);
};
exports.default = deployAssetManager;
deployAssetManager.id = exports.TREASURY_MANAGER_DID;
deployAssetManager.tags = ["local", "test", exports.TREASURY_MANAGER_DID];
deployAssetManager.dependencies = [
    _31_deployARFVToken_1.ARFV_TOKEN_DID,
    _03_deployTreasury_1.TREASURY_DID,
    _38_deployExodiaRoles_1.EXODIA_ROLES_DID,
];
