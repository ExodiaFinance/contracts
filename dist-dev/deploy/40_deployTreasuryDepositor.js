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
exports.TREASURY_DEPOSITOR_DID = void 0;
const toggleRights_1 = __importStar(require("../packages/utils/toggleRights"));
const utils_1 = require("../packages/utils/utils");
const _03_deployTreasury_1 = require("./03_deployTreasury");
const _31_deployARFVToken_1 = require("./31_deployARFVToken");
const _38_deployExodiaRoles_1 = require("./38_deployExodiaRoles");
const _46_deployPnlTracker_1 = require("./46_deployPnlTracker");
exports.TREASURY_DEPOSITOR_DID = "treasury_depositor";
const deployTreasuryDepositor = async ({ deploy, get, getNamedAccounts }) => {
    const { contract: treasury } = await get("OlympusTreasury");
    const { contract: arfv } = await get("AllocatedRiskFreeValue");
    const { contract: pnlTracker } = await get("PNLTracker");
    const { contract: roles } = await get("ExodiaRoles");
    const { contract: depositor, deployment } = await deploy("TreasuryDepositor", []);
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        await (0, utils_1.exec)(() =>
            depositor.initialize(
                treasury.address,
                arfv.address,
                pnlTracker.address,
                roles.address
            )
        );
        await (0, utils_1.exec)(() =>
            (0, toggleRights_1.default)(
                treasury,
                toggleRights_1.MANAGING.RESERVEMANAGER,
                depositor.address
            )
        );
        await (0, utils_1.exec)(() =>
            (0, toggleRights_1.default)(
                treasury,
                toggleRights_1.MANAGING.LIQUIDITYDEPOSITOR,
                depositor.address
            )
        );
        await (0, utils_1.exec)(() =>
            (0, toggleRights_1.default)(
                treasury,
                toggleRights_1.MANAGING.RESERVEDEPOSITOR,
                depositor.address
            )
        );
        await (0, utils_1.exec)(() => arfv.addMinter(depositor.address));
        await (0, utils_1.exec)(() => pnlTracker.addMachine(depositor.address));
    }
    (0, utils_1.log)("Treasury Depositor: ", depositor.address);
};
exports.default = deployTreasuryDepositor;
deployTreasuryDepositor.id = exports.TREASURY_DEPOSITOR_DID;
deployTreasuryDepositor.tags = ["local", "test", exports.TREASURY_DEPOSITOR_DID];
deployTreasuryDepositor.dependencies = [
    _31_deployARFVToken_1.ARFV_TOKEN_DID,
    _03_deployTreasury_1.TREASURY_DID,
    _38_deployExodiaRoles_1.EXODIA_ROLES_DID,
    _46_deployPnlTracker_1.PNLTRACKER_DID,
];
