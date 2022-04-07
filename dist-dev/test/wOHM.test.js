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
const _17_deployWOHM_1 = require("../deploy/17_deployWOHM");
const mint_1 = __importDefault(require("../packages/utils/mint"));
const utils_1 = require("../packages/utils/utils");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts } = xhre;
describe("test wOHM", function () {
    beforeEach(async function () {
        await deployments.fixture([
            _17_deployWOHM_1.WOHM_DID,
            _03_deployTreasury_1.TREASURY_DID,
            _05_deployStaking_1.STAKING_DID,
        ]);
    });
    it("Should be able to wrap/unwrap from OHM", async function () {
        const { deployer } = await getNamedAccounts();
        const { contract: ohm } = await get("OlympusERC20Token");
        const { contract: sohm } = await get("sOlympus");
        const { contract: treasury } = await get("OlympusTreasury");
        const { contract: dai } = await get("DAI");
        const { contract: wohm } = await get("wOHM");
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
        await ohm.approve(wohm.address, (0, utils_1.toWei)(1, utils_1.OHM_DECIMALS));
        await wohm.wrapFromOHM((0, utils_1.toWei)(1, utils_1.OHM_DECIMALS));
        const wohmBalance = await wohm.balanceOf(deployer);
        const wohmSohmBalance = await sohm.balanceOf(wohm.address);
        (0, chai_1.expect)(wohmBalance.toString()).to.eq(
            (0, utils_1.toWei)(1, utils_1.WOHM_DECIMALS)
        );
        (0, chai_1.expect)(wohmSohmBalance.toString()).to.eq(
            (0, utils_1.toWei)(1, utils_1.OHM_DECIMALS)
        );
        await wohm.unwrapToOHM((0, utils_1.toWei)(1, utils_1.WOHM_DECIMALS));
        const unstakedOhm = await ohm.balanceOf(deployer);
        (0, chai_1.expect)(unstakedOhm.toString()).to.eq(
            (0, utils_1.toWei)(1, utils_1.OHM_DECIMALS)
        );
    });
    it("Should be able to wrap/unwrap from sOHM", async function () {
        const { deployer } = await getNamedAccounts();
        const { contract: stakingHelper } = await get("StakingHelperV2");
        const { contract: ohm } = await get("OlympusERC20Token");
        const { contract: sohm } = await get("sOlympus");
        const { contract: treasury } = await get("OlympusTreasury");
        const { contract: dai } = await get("DAI");
        const { contract: wohm } = await get("wOHM");
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
        await sohm.approve(wohm.address, (0, utils_1.toWei)(1, utils_1.OHM_DECIMALS));
        await wohm.wrapFromsOHM((0, utils_1.toWei)(1, utils_1.OHM_DECIMALS));
        const wohmBalance = await wohm.balanceOf(deployer);
        (0, chai_1.expect)(wohmBalance.toString()).to.eq(
            (0, utils_1.toWei)(1, utils_1.WOHM_DECIMALS)
        );
        await wohm.unwrapTosOHM((0, utils_1.toWei)(1, utils_1.WOHM_DECIMALS));
        const sohmBalance = await sohm.balanceOf(deployer);
        (0, chai_1.expect)(sohmBalance.toString()).to.eq(
            (0, utils_1.toWei)(1, utils_1.OHM_DECIMALS)
        );
    });
});
