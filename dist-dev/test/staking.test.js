"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = __importDefault(require("hardhat"));
const _03_deployTreasury_1 = require("../deploy/03_deployTreasury");
const _05_deployStaking_1 = require("../deploy/05_deployStaking");
const mint_1 = __importDefault(require("../packages/utils/mint"));
const utils_1 = require("../packages/utils/utils");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts } = xhre;
describe("test staking", function () {
    beforeEach(async function () {
        await deployments.fixture([
            _05_deployStaking_1.STAKING_DID,
            _03_deployTreasury_1.TREASURY_DID,
        ]);
    });
    it("Should be able to stake", async function () {
        const { deployer } = await getNamedAccounts();
        const { contract: stakingHelper } = await get("StakingHelperV2");
        const { contract: sohm } = await get("sOlympus");
        const { contract: ohm } = await get("OlympusERC20Token");
        const { contract: treasury } = await get("OlympusTreasury");
        const { contract: dai } = await get("DAI");
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
        await ohm.approve(
            stakingHelper.address,
            (0, utils_1.toWei)(1, utils_1.OHM_DECIMALS)
        );
        await stakingHelper.stake((0, utils_1.toWei)(1, utils_1.OHM_DECIMALS), deployer);
        const sohmBalance = await sohm.balanceOf(deployer);
        (0, chai_1.expect)(sohmBalance.toString()).to.eq(
            (0, utils_1.toWei)(1, utils_1.OHM_DECIMALS)
        );
    });
});
