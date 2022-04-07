"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const hardhat_1 = __importDefault(require("hardhat"));
const _16_mintOHM_1 = require("../../deploy/16_mintOHM");
const _24_liquidLockStakingDeployment_1 = require("../../deploy/24_liquidLockStakingDeployment");
const mint_1 = __importDefault(require("../../packages/utils/mint"));
const utils_1 = require("../../packages/utils/utils");
const xhre = hardhat_1.default;
const { deployments, get, deploy, getNamedAccounts } = xhre;
const parseUnits = ethers_1.ethers.utils.parseUnits;
describe("LiquidLockStaking", function () {
    let deployer;
    let wsexod;
    let exod;
    let liquidLockStaking;
    let rewardHandler;
    let dai;
    let treasury;
    beforeEach(async function () {
        const accounts = await getNamedAccounts();
        deployer = accounts.deployer;
        await deployments.fixture([
            _24_liquidLockStakingDeployment_1.LIQUID_LOCK_STAKING_DID,
            _16_mintOHM_1.MINT_OHM_DID,
        ]);
        const treasuryDeployment = await get("OlympusTreasury");
        treasury = treasuryDeployment.contract;
        const wohmDeployment = await get("wOHM");
        wsexod = wohmDeployment.contract;
        const daiDeployment = await get("DAI");
        dai = daiDeployment.contract;
        const ohmDeployment = await get("OlympusERC20Token");
        exod = ohmDeployment.contract;
        const llsDeployment = await get("LiquidLockStaking");
        liquidLockStaking = llsDeployment.contract;
        const rewardHandlerDeployment = await get("LLSRewardHandler");
        rewardHandler = rewardHandlerDeployment.contract;
        // Mint wsEXOD
        await (0,
        mint_1.default)(deployer, treasury, dai, (0, utils_1.toWei)(100, utils_1.DAI_DECIMALS));
        await exod.approve(wsexod.address, (0, utils_1.toWei)(100, utils_1.OHM_DECIMALS));
        await wsexod.wrapFromOHM((0, utils_1.toWei)(100, utils_1.OHM_DECIMALS));
    });
    it("Should stake", async function () {
        const wsExodBal = await wsexod.balanceOf(deployer);
        // console.log(liquidLockStaking);
        await wsexod.approve(liquidLockStaking.address, wsExodBal);
        const fnftId = await liquidLockStaking.lock(wsExodBal.mul(90).div(100), 3, {
            value: parseUnits("3", "ether"),
        });
    });
});
