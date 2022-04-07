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
exports.STAKING_DISTRIBUTOR_DID = void 0;
const toggleRights_1 = __importStar(require("../packages/utils/toggleRights"));
const utils_1 = require("../packages/utils/utils");
const _01_deployOhm_1 = require("./01_deployOhm");
const _03_deployTreasury_1 = require("./03_deployTreasury");
const _05_deployStaking_1 = require("./05_deployStaking");
exports.STAKING_DISTRIBUTOR_DID = "distributor";
const deployDistributor = async ({ deploy, get }) => {
    const { contract: ohm } = await get("OlympusERC20Token");
    const { contract: staking } = await get("OlympusStaking");
    const { contract: treasury } = await get("OlympusTreasury");
    const { contract: distributor, deployment } = await deploy("Distributor", [
        treasury.address,
        ohm.address,
        _05_deployStaking_1.STAKING_EPOCH_LENGTH,
        _05_deployStaking_1.STAKING_EPOCH_LENGTH,
    ]);
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        await staking.setContract(0, distributor.address);
    }
    if (!(await treasury.isRewardManager(distributor.address))) {
        (0, toggleRights_1.default)(
            treasury,
            toggleRights_1.MANAGING.REWARDMANAGER,
            distributor.address
        );
    }
    (0, utils_1.log)("Distributor:", distributor.address);
};
exports.default = deployDistributor;
deployDistributor.id = exports.STAKING_DISTRIBUTOR_DID;
deployDistributor.tags = [
    "local",
    "test",
    exports.STAKING_DISTRIBUTOR_DID,
    _05_deployStaking_1.STAKING_DID,
];
deployDistributor.dependencies = [
    _01_deployOhm_1.OHM_DID,
    _03_deployTreasury_1.TREASURY_DID,
];
deployDistributor.runAtTheEnd = true;
