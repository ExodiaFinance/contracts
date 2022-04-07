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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = __importDefault(require("hardhat"));
const _03_deployTreasury_1 = require("../deploy/03_deployTreasury");
const mint_1 = __importDefault(require("../packages/utils/mint"));
const toggleRights_1 = __importStar(require("../packages/utils/toggleRights"));
const utils_1 = require("../packages/utils/utils");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts } = xhre;
describe("test treasury", function () {
    beforeEach(async function () {
        await deployments.fixture([_03_deployTreasury_1.TREASURY_DID]);
    });
    it("Should be deploy", async function () {
        const { contract: treasury } = await get("OlympusTreasury");
        const { deployer } = await getNamedAccounts();
        (0, chai_1.expect)(treasury.address).to.not.be.undefined;
        (0, chai_1.expect)(await treasury.manager()).to.be.equal(deployer);
    });
    it("Should be able to deposit", async function () {
        const { contract: treasury } = await get("OlympusTreasury");
        const { deployer } = await getNamedAccounts();
        await (0, toggleRights_1.default)(
            treasury,
            toggleRights_1.MANAGING.RESERVEDEPOSITOR,
            deployer
        );
        (0, chai_1.expect)(await treasury.isReserveDepositor(deployer)).to.be.true;
    });
    it("Should not be able to deposit", async function () {
        const { contract: treasury } = await get("OlympusTreasury");
        const { deployer } = await getNamedAccounts();
        (0, chai_1.expect)(await treasury.isReserveDepositor(deployer)).to.be.false;
    });
    it("Should mint 1 OHM", async function () {
        const { deployer } = await getNamedAccounts();
        const { contract: treasury } = await get("OlympusTreasury");
        const { contract: ohm } = await get("OlympusERC20Token");
        const { contract: dai } = await get("DAI");
        await (0, toggleRights_1.default)(
            treasury,
            toggleRights_1.MANAGING.RESERVEDEPOSITOR,
            deployer
        );
        await (0, mint_1.default)(
            deployer,
            treasury,
            dai,
            (0, utils_1.toWei)(1, utils_1.DAI_DECIMALS)
        );
        const ohmBalance = await ohm.balanceOf(deployer);
        (0, chai_1.expect)(ohmBalance.toString()).to.eq(
            (0, utils_1.toWei)(1, utils_1.OHM_DECIMALS)
        );
    });
});
