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
exports.ALLOW_DAI_BOND_TREASURY = void 0;
const toggleRights_1 = __importStar(require("../packages/utils/toggleRights"));
const _00_deployDai_1 = require("./00_deployDai");
const _03_deployTreasury_1 = require("./03_deployTreasury");
const _11_deployDaiBond_1 = require("./11_deployDaiBond");
exports.ALLOW_DAI_BOND_TREASURY = "allow_dai_bond_treasury";
const allowDaiBondsTreasury = async ({ get }) => {
    const { contract: dai } = await get("DAI");
    const { contract: treasury } = await get("OlympusTreasury");
    const { contract: bond } = await get("DAIBondDepository");
    if (!(await treasury.isReserveDepositor(bond.address))) {
        await (0, toggleRights_1.default)(
            treasury,
            toggleRights_1.MANAGING.RESERVEDEPOSITOR,
            bond.address
        );
    }
    if (!(await treasury.isReserveDepositor(dai.address))) {
        await (0, toggleRights_1.default)(
            treasury,
            toggleRights_1.MANAGING.RESERVEDEPOSITOR,
            dai.address
        );
    }
};
exports.default = allowDaiBondsTreasury;
allowDaiBondsTreasury.id = exports.ALLOW_DAI_BOND_TREASURY;
allowDaiBondsTreasury.tags = ["local", "test", exports.ALLOW_DAI_BOND_TREASURY];
allowDaiBondsTreasury.dependencies = [
    _03_deployTreasury_1.TREASURY_DID,
    _11_deployDaiBond_1.DAI_BOND_DID,
    _00_deployDai_1.DAI_DID,
];
