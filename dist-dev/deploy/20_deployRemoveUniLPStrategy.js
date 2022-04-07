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
exports.DEPLOY_REMOVE_UNI_LP_STRATEGY_DID = void 0;
const toggleRights_1 = __importStar(require("../packages/utils/toggleRights"));
const utils_1 = require("../packages/utils/utils");
const _03_deployTreasury_1 = require("./03_deployTreasury");
exports.DEPLOY_REMOVE_UNI_LP_STRATEGY_DID = "remove_uni_lp_strategy";
const deployUniLpStrategy = async ({ get, deploy, getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts();
    const { contract: treasury } = await get("OlympusTreasury");
    const { contract: removeUniLP } = await deploy("RemoveUniLp", [treasury.address]);
    if ((await treasury.manager()) === deployer) {
        if (!(await treasury.isReserveDepositor(removeUniLP.address))) {
            await (0, toggleRights_1.default)(
                treasury,
                toggleRights_1.MANAGING.RESERVEDEPOSITOR,
                removeUniLP.address
            );
        }
        if (!(await treasury.isLiquidityManager(removeUniLP.address))) {
            await (0, toggleRights_1.default)(
                treasury,
                toggleRights_1.MANAGING.LIQUIDITYMANAGER,
                removeUniLP.address
            );
        }
    }
};
exports.default = deployUniLpStrategy;
deployUniLpStrategy.id = exports.DEPLOY_REMOVE_UNI_LP_STRATEGY_DID;
deployUniLpStrategy.tags = ["local", "test", exports.DEPLOY_REMOVE_UNI_LP_STRATEGY_DID];
deployUniLpStrategy.dependencies = (0, utils_1.ifNotProd)([
    _03_deployTreasury_1.TREASURY_DID,
]);
