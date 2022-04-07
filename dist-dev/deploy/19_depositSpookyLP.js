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
exports.SPOOKY_SWAP_FACTORY = exports.DEPOSIT_SPOOKY_LP = void 0;
const toggleRights_1 = __importStar(require("../packages/utils/toggleRights"));
const typechain_1 = require("../packages/sdk/typechain");
const _03_deployTreasury_1 = require("./03_deployTreasury");
const _04_setVault_1 = require("./04_setVault");
const _09_deployOlympusBondingCalculator_1 = require("./09_deployOlympusBondingCalculator");
const _18_addSpookyLP_1 = require("./18_addSpookyLP");
exports.DEPOSIT_SPOOKY_LP = "deposit_spooky_lp";
exports.SPOOKY_SWAP_FACTORY = "0x152eE697f2E276fA89E96742e9bB9aB1F2E61bE3";
const addSpookyLP = async ({ get, getNamedAccounts, ethers }) => {
    const { deployer } = await getNamedAccounts();
    const { contract: ohm } = await get("OlympusERC20Token");
    const { contract: dai } = await get("DAI");
    const { contract: treasury } = await get("OlympusTreasury");
    const spookyPairFactory = await typechain_1.IUniswapV2Factory__factory.connect(
        exports.SPOOKY_SWAP_FACTORY,
        await ethers.getSigner(deployer)
    );
    const pair = await spookyPairFactory.getPair(ohm.address, dai.address);
    if (!(await treasury.isLiquidityDepositor(deployer))) {
        await (0, toggleRights_1.default)(
            treasury,
            toggleRights_1.MANAGING.LIQUIDITYDEPOSITOR,
            deployer
        );
    }
    const { contract: bondCalculator } = await get("OlympusBondingCalculator");
    if (!(await treasury.isLiquidityToken(pair))) {
        await (0, toggleRights_1.default)(
            treasury,
            toggleRights_1.MANAGING.LIQUIDITYTOKEN,
            pair,
            bondCalculator.address
        );
    }
    const pairERC = await typechain_1.ERC20__factory.connect(
        pair,
        await ethers.getSigner(deployer)
    );
    const balanceOfLP = await pairERC.balanceOf(deployer);
    const depositAmount = balanceOfLP.div(2);
    await pairERC.approve(treasury.address, depositAmount);
    await treasury.deposit(depositAmount, pair, 0);
};
exports.default = addSpookyLP;
addSpookyLP.id = exports.DEPOSIT_SPOOKY_LP;
addSpookyLP.tags = ["local", "test", exports.DEPOSIT_SPOOKY_LP];
addSpookyLP.dependencies = [
    _03_deployTreasury_1.TREASURY_DID,
    _04_setVault_1.OHM_SET_VAULT_DID,
    _18_addSpookyLP_1.ADD_SPOOKY_LP_DID,
    _09_deployOlympusBondingCalculator_1.BONDING_CALCULATOR_DID,
];
