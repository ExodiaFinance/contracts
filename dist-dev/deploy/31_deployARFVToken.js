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
exports.ARFV_TOKEN_DID = void 0;
const toggleRights_1 = __importStar(require("../packages/utils/toggleRights"));
const utils_1 = require("../packages/utils/utils");
const _03_deployTreasury_1 = require("./03_deployTreasury");
exports.ARFV_TOKEN_DID = "arfv_token";
const deployARFVToken = async ({ deploy, get, getNamedAccounts, getNetwork }) => {
    const { contract: treasury } = await get("OlympusTreasury");
    const { deployer } = await getNamedAccounts();
    const { contract: arfv, deployment } = await deploy("AllocatedRiskFreeValue", []);
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        if ((await treasury.manager()) === deployer) {
            await (0, toggleRights_1.default)(
                treasury,
                toggleRights_1.MANAGING.RESERVETOKEN,
                arfv.address
            );
        }
    }
    (0, utils_1.log)("ARFV token", arfv.address);
};
exports.default = deployARFVToken;
deployARFVToken.id = exports.ARFV_TOKEN_DID;
deployARFVToken.tags = ["local", "test", exports.ARFV_TOKEN_DID];
deployARFVToken.dependencies = (0, utils_1.ifNotProd)([
    _03_deployTreasury_1.TREASURY_DID,
]);
