"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = __importDefault(require("hardhat"));
const _03_deployTreasury_1 = require("../../deploy/03_deployTreasury");
const _04_setVault_1 = require("../../deploy/04_setVault");
const _09_deployOlympusBondingCalculator_1 = require("../../deploy/09_deployOlympusBondingCalculator");
const _18_addSpookyLP_1 = require("../../deploy/18_addSpookyLP");
const _19_depositSpookyLP_1 = require("../../deploy/19_depositSpookyLP");
const _20_deployRemoveUniLPStrategy_1 = require("../../deploy/20_deployRemoveUniLPStrategy");
const utils_1 = require("../../packages/utils/utils");
const typechain_1 = require("../../packages/sdk/typechain");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts, deploy } = xhre;
describe("test treasury", function () {
    let treasury;
    let ohm;
    let dai;
    let spookyRouter;
    let spookyFactory;
    let deployer;
    let strategy;
    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
        await deployments.fixture([
            _03_deployTreasury_1.TREASURY_DID,
            _04_setVault_1.OHM_SET_VAULT_DID,
            _19_depositSpookyLP_1.DEPOSIT_SPOOKY_LP,
            _09_deployOlympusBondingCalculator_1.BONDING_CALCULATOR_DID,
            _20_deployRemoveUniLPStrategy_1.DEPLOY_REMOVE_UNI_LP_STRATEGY_DID,
        ]);
        const treasuryDeployment = await get("OlympusTreasury");
        treasury = treasuryDeployment.contract;
        const ohmDeployment = await get("OlympusERC20Token");
        ohm = ohmDeployment.contract;
        const daiDeployment = await get("DAI");
        dai = daiDeployment.contract;
        spookyRouter = await typechain_1.UniswapV2Router02__factory.connect(
            _18_addSpookyLP_1.SPOOKY_SWAP_ROUTER,
            await xhre.ethers.getSigner(deployer)
        );
        spookyFactory = await typechain_1.UniswapV2Factory__factory.connect(
            _19_depositSpookyLP_1.SPOOKY_SWAP_FACTORY,
            await xhre.ethers.getSigner(deployer)
        );
        const strategyDeployment = await get("RemoveUniLp");
        strategy = strategyDeployment.contract;
    });
    it("can swap dai to ohm", async function () {
        const expiration = Math.round(new Date().valueOf() / 1000 + 3600);
        await dai.mint(deployer, (0, utils_1.toWei)(100, utils_1.DAI_DECIMALS));
        await dai.approve(
            spookyRouter.address,
            (0, utils_1.toWei)(1, utils_1.DAI_DECIMALS)
        );
        await spookyRouter.swapExactTokensForTokens(
            (0, utils_1.toWei)(1, utils_1.DAI_DECIMALS),
            (0, utils_1.toWei)(0.9, utils_1.OHM_DECIMALS),
            [dai.address, ohm.address],
            deployer,
            expiration
        );
    });
    it("removes lp and deposit the assets", async function () {
        /*OHM is trading at 1DAI in this test*/
        await dai.mint(deployer, (0, utils_1.toWei)(999, utils_1.DAI_DECIMALS));
        await dai.approve(
            treasury.address,
            (0, utils_1.toWei)(999, utils_1.DAI_DECIMALS)
        );
        await treasury.deposit(
            (0, utils_1.toWei)(999, utils_1.DAI_DECIMALS),
            dai.address,
            (0, utils_1.toWei)(999, utils_1.OHM_DECIMALS)
        );
        const preDaiTreasuryBalance = await dai.balanceOf(treasury.address);
        const pairAddress = await spookyFactory.getPair(ohm.address, dai.address);
        const pair = typechain_1.UniswapV2Pair__factory.connect(
            pairAddress,
            await xhre.ethers.getSigner(deployer)
        );
        const lpDaiBalance = await dai.balanceOf(pair.address);
        const lpOhmBalance = await ohm.balanceOf(pair.address);
        (0, chai_1.expect)(lpDaiBalance.toString()).to.not.eq("0");
        const lpTotalSupply = await pair.totalSupply();
        const preLpBal = await pair.balanceOf(treasury.address);
        const preExcessReserve = await treasury.excessReserves();
        await strategy.remove(_18_addSpookyLP_1.SPOOKY_SWAP_ROUTER, pairAddress);
        const lpTreasuryBal = await pair.balanceOf(treasury.address);
        (0, chai_1.expect)(lpTreasuryBal.toString()).to.eq("0");
        const daiTreasuryBalance = await dai.balanceOf(treasury.address);
        const daiOut = preLpBal.mul(lpDaiBalance).div(lpTotalSupply);
        const depositedDai = daiTreasuryBalance.sub(preDaiTreasuryBalance);
        (0, chai_1.expect)(depositedDai.sub(daiOut).toNumber()).to.lt(1e9);
        const ohmTreasuryBalance = await ohm.balanceOf(treasury.address);
        const ohmOut = preLpBal.mul(lpOhmBalance).div(lpTotalSupply);
        (0, chai_1.expect)(ohmTreasuryBalance.sub(ohmOut).toNumber()).to.lt(1e9);
        // Make sure no ohm is minted
        const strategyOhmBalance = await ohm.balanceOf(strategy.address);
        (0, chai_1.expect)(strategyOhmBalance.toString()).to.eq("0");
        // Mare sure the DAI deposited goes toward the excess reserve
        const excessReserve = await treasury.excessReserves();
        const diffExcessReserve = excessReserve.sub(preExcessReserve);
        console.log(preExcessReserve.toString(), excessReserve.toString());
        // Because we have 1 DAI==1 OHM, excess reserve from LP reduces from OHM taken out of LP
        (0, chai_1.expect)(preExcessReserve.sub(ohmOut).div(1e5).toString()).eq(
            excessReserve.div(1e5).toString()
        );
        (0, chai_1.expect)(diffExcessReserve.sub(daiOut.div(1e9)).toNumber()).to.lt(1e6);
    });
});
