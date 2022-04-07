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
exports.MINT_OHM_DID = void 0;
const toggleRights_1 = __importStar(require("../packages/utils/toggleRights"));
const utils_1 = require("../packages/utils/utils");
const _03_deployTreasury_1 = require("./03_deployTreasury");
const _04_setVault_1 = require("./04_setVault");
const _15_mintDai_1 = require("./15_mintDai");
exports.MINT_OHM_DID = "mint_ohm_token";
const mintDai = async ({ get, getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts();
    const { contract: dai } = await get("DAI");
    const { contract: treasury } = await get("OlympusTreasury");
    if (!(await treasury.isReserveDepositor(deployer))) {
        await (0, toggleRights_1.default)(
            treasury,
            toggleRights_1.MANAGING.RESERVEDEPOSITOR,
            deployer
        );
    }
    const amount = (0, utils_1.toWei)(100, utils_1.DAI_DECIMALS);
    await dai.approve(treasury.address, amount);
    await treasury.deposit(amount, dai.address, 0);
};
exports.default = mintDai;
mintDai.id = exports.MINT_OHM_DID;
mintDai.tags = ["local", "test", exports.MINT_OHM_DID];
mintDai.dependencies = [
    _15_mintDai_1.MINT_DAI_DID,
    _03_deployTreasury_1.TREASURY_DID,
    _04_setVault_1.OHM_SET_VAULT_DID,
];
