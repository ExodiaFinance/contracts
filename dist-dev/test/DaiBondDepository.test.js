"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const ethers_1 = require("ethers");
const hardhat_1 = __importDefault(require("hardhat"));
const _11_deployDaiBond_1 = require("../deploy/11_deployDaiBond");
const _12_daiBondSetStaking_1 = require("../deploy/12_daiBondSetStaking");
const _13_allowDaiBondsTreasuryAccess_1 = require("../deploy/13_allowDaiBondsTreasuryAccess");
const _16_mintOHM_1 = require("../deploy/16_mintOHM");
const _07_deployStakingHelper_1 = require("../deploy/07_deployStakingHelper");
const _05_deployStaking_1 = require("../deploy/05_deployStaking");
const utils_1 = require("../packages/utils/utils");
const testUtils_1 = require("./testUtils");
const xhre = hardhat_1.default;
const { deployments, get, deploy, getNamedAccounts } = xhre;
describe("Dai bond depository", function () {
    let user;
    let daiBond;
    let dai, ohm;
    let treasury;
    let sohm;
    let staking;
    let stakingHelper;
    let deployer, dao;
    beforeEach(async function () {
        [, user] = await hardhat_1.default.ethers.getSigners();
        const accounts = await getNamedAccounts();
        deployer = accounts.deployer;
        dao = accounts.DAO;
        await deployments.fixture([
            _05_deployStaking_1.STAKING_DID,
            _07_deployStakingHelper_1.STAKING_HELPER_DID,
            _11_deployDaiBond_1.DAI_BOND_DID,
            _12_daiBondSetStaking_1.DAI_BOND_SET_STAKING_DID,
            _13_allowDaiBondsTreasuryAccess_1.ALLOW_DAI_BOND_TREASURY,
            _16_mintOHM_1.MINT_OHM_DID,
        ]);
        const daiDeploy = await get("DAI");
        dai = daiDeploy.contract;
        const daiBondDeployment = await get("DAIBondDepository");
        daiBond = daiBondDeployment.contract;
        const stakingDeployment = await get("OlympusStaking");
        staking = stakingDeployment.contract;
        const stakingHelperDeployment = await get("StakingHelperV2");
        stakingHelper = stakingHelperDeployment.contract;
        const sohmDeployment = await get("sOlympus");
        sohm = sohmDeployment.contract;
        const treasuryDeployment = await get("OlympusTreasury");
        treasury = treasuryDeployment.contract;
        const ohmDeployment = await get("OlympusERC20Token");
        ohm = ohmDeployment.contract;
    });
    it("should be able to bond", async function () {
        const bondAmount = (0, utils_1.toWei)(100, utils_1.DAI_DECIMALS);
        await dai.mint(deployer, bondAmount);
        await dai.approve(daiBond.address, bondAmount);
        await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);
    });
    it("bond price usd vs bond price", async function () {
        const bondAmount0 = ethers_1.ethers.utils.parseUnits("10", "ether");
        await dai.mint(deployer, bondAmount0);
        await dai.approve(daiBond.address, bondAmount0);
        await daiBond.deposit(bondAmount0, await daiBond.bondPrice(), deployer);
        const bondPrice = await daiBond.bondPrice();
        const bondPriceUSD = await daiBond.bondPriceInUSD();
        (0, chai_1.expect)(bondPrice.toString()).eq(
            bondPriceUSD.div(1e9).div(1e7).toString()
        );
    });
    it("Should increase debt when bonding", async function () {
        const debt0 = await daiBond.currentDebt();
        const bondAmount0 = ethers_1.ethers.utils.parseUnits("10", "ether");
        await dai.mint(deployer, bondAmount0);
        await dai.approve(daiBond.address, bondAmount0);
        await daiBond.deposit(bondAmount0, await daiBond.bondPrice(), deployer);
        const debt1 = await daiBond.currentDebt();
        // bonds are sold at 1$
        (0, chai_1.expect)(debt1.sub(debt0).toString()).to.eq(
            bondAmount0.div(1e9).toString()
        );
        const bondAmount1 = ethers_1.ethers.utils.parseUnits("20", "ether");
        await dai.mint(deployer, bondAmount1);
        await dai.approve(daiBond.address, bondAmount1);
        await daiBond.deposit(bondAmount1, await daiBond.bondPrice(), deployer);
        const debt2 = await daiBond.currentDebt();
        (0, chai_1.expect)(debt2.toString()).to.eq(
            bondAmount0
                .add(bondAmount1)
                .sub(bondAmount0.div(1000).mul(3))
                .div(1e9)
                .toString()
        );
    });
    it("Should sell at 1$ price", async function () {
        const payout = await daiBond.payoutFor(1e9);
        (0, chai_1.expect)(payout).to.eq(1e9);
    });
    it("Should sell at min price", async function () {
        await daiBond.setBondTerms(4, 200);
        const payout = await daiBond.payoutFor(10e9);
        (0, chai_1.expect)(payout).to.eq(5e9);
    });
    it("Should set bond terms", async function () {
        // only policy
        await (0, chai_1.expect)(
            daiBond.connect(user).setBondTerms(0, 0)
        ).to.revertedWith("Ownable: caller is not the owner");
        // vestingTerm
        await (0, chai_1.expect)(daiBond.setBondTerms(0, 1000)).to.revertedWith(
            "Vesting must be longer than 36 hours"
        );
        await daiBond.setBondTerms(0, 10001);
        (0, chai_1.expect)((await daiBond.terms()).vestingTerm).to.equal(10001);
        // maxPayout
        await (0, chai_1.expect)(daiBond.setBondTerms(1, 1001)).to.revertedWith(
            "Payout cannot be above 1 percent"
        );
        await daiBond.setBondTerms(1, 999);
        (0, chai_1.expect)((await daiBond.terms()).maxPayout).to.equal(999);
        // fee
        await (0, chai_1.expect)(daiBond.setBondTerms(2, 10001)).to.revertedWith(
            "DAO fee cannot exceed payout"
        );
        await daiBond.setBondTerms(2, 9999);
        (0, chai_1.expect)((await daiBond.terms()).fee).to.equal(9999);
        // maxDebt
        await daiBond.setBondTerms(3, 10001);
        (0, chai_1.expect)((await daiBond.terms()).maxDebt).to.equal(10001);
        // minimumPrice
        await daiBond.setBondTerms(4, 10001);
        (0, chai_1.expect)((await daiBond.terms()).minimumPrice).to.equal(10001);
    });
    it("Should set adjustment", async function () {
        // only policy
        await (0, chai_1.expect)(
            daiBond.connect(user).setAdjustment(true, 0, 0, 0)
        ).to.revertedWith("Ownable: caller is not the owner");
        await daiBond.setAdjustment(true, 1, 110, 10);
        (0, chai_1.expect)((await daiBond.adjustment()).add).to.equal(true);
        (0, chai_1.expect)((await daiBond.adjustment()).rate).to.equal(1);
        (0, chai_1.expect)((await daiBond.adjustment()).target).to.equal(110);
        (0, chai_1.expect)((await daiBond.adjustment()).buffer).to.equal(10);
    });
    it("Should set contract for auto stake", async function () {
        // only policy
        await (0, chai_1.expect)(
            daiBond.connect(user).setStaking(utils_1.ZERO_ADDRESS, true)
        ).to.revertedWith("Ownable: caller is not the owner");
        await (0, chai_1.expect)(daiBond.setStaking(utils_1.ZERO_ADDRESS, true)).to
            .reverted;
        await daiBond.setStaking(user.address, true);
        (0, chai_1.expect)(await daiBond.useHelper()).to.equal(true);
        (0, chai_1.expect)(await daiBond.stakingHelper()).to.equal(user.address);
        await daiBond.setStaking(user.address, false);
        (0, chai_1.expect)(await daiBond.useHelper()).to.equal(false);
        (0, chai_1.expect)(await daiBond.staking()).to.equal(user.address);
    });
    describe("deposit", () => {
        it("invalid depositor", async () => {
            await (0, chai_1.expect)(
                daiBond.deposit(0, await daiBond.bondPrice(), utils_1.ZERO_ADDRESS)
            ).to.revertedWith("Invalid address");
        });
        it("Max capacity reached", async () => {
            // set maxDebt to zero
            await daiBond.setBondTerms(3, 0);
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);
            await (0, chai_1.expect)(
                daiBond.deposit(0, await daiBond.bondPrice(), deployer)
            ).to.revertedWith("Max capacity reached");
        });
        it("Slippage limit: more than max price", async () => {
            await (0, chai_1.expect)(
                daiBond.deposit(0, (await daiBond.bondPrice()).sub(1), deployer)
            ).to.revertedWith("Slippage limit: more than max price");
        });
        it("Bond too small", async () => {
            await (0, chai_1.expect)(
                daiBond.deposit(0, await daiBond.bondPrice(), deployer)
            ).to.revertedWith("Bond too small");
        });
        it("Bond too large", async () => {
            // set max payout to zero
            await daiBond.setBondTerms(1, 0);
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            await (0, chai_1.expect)(
                daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer)
            ).to.revertedWith("Bond too large");
        });
        it("should receive correct amount after deposit (include treasury)", async () => {
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            const value = ethers_1.ethers.utils.parseUnits("10", 9);
            const payout = await daiBond.payoutFor(value);
            const fee = payout.mul((await daiBond.terms()).fee).div(10000);
            const depositorBalanceBefore = await ohm.balanceOf(daiBond.address);
            const daoBalanceBefore = await ohm.balanceOf(dao);
            const treasuryBalanceBefore = await dai.balanceOf(treasury.address);
            const totalDebtBefore = await daiBond.totalDebt();
            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);
            (0, chai_1.expect)(await ohm.balanceOf(daiBond.address)).to.equal(
                depositorBalanceBefore.add(payout)
            );
            (0, chai_1.expect)(await ohm.balanceOf(dao)).to.equal(
                daoBalanceBefore.add(fee)
            );
            (0, chai_1.expect)(await daiBond.totalDebt()).to.equal(
                totalDebtBefore.add(value)
            );
            (0, chai_1.expect)((await daiBond.bondInfo(deployer)).payout).to.equal(
                payout
            );
            (0, chai_1.expect)(await dai.balanceOf(treasury.address)).to.equal(
                treasuryBalanceBefore.add(bondAmount)
            );
        });
        it("should decay debt at next deposit", async () => {
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            const value = ethers_1.ethers.utils.parseUnits("10", 9);
            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);
            (0, chai_1.expect)(await daiBond.totalDebt()).to.equal(value);
            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);
            (0, chai_1.expect)(await daiBond.totalDebt()).to.lt(value.mul(2));
        });
        it("should increase control variable based on adjustment params", async () => {
            await daiBond.setAdjustment(true, 1, 110, 2);
            (0, chai_1.expect)((await daiBond.terms()).controlVariable).to.equal(100);
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);
            (0, chai_1.expect)((await daiBond.terms()).controlVariable).to.gt(100);
        });
        it("should decrease control variable based on adjustment params", async () => {
            await daiBond.setAdjustment(false, 1, 90, 2);
            (0, chai_1.expect)((await daiBond.terms()).controlVariable).to.equal(100);
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);
            (0, chai_1.expect)((await daiBond.terms()).controlVariable).to.lt(100);
        });
        it("should stop adjustment after control variable reaches target", async () => {
            await daiBond.setAdjustment(false, 1, 99, 2);
            (0, chai_1.expect)((await daiBond.terms()).controlVariable).to.equal(100);
            (0, chai_1.expect)((await daiBond.adjustment()).rate).to.equal(1);
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);
            (0, chai_1.expect)((await daiBond.terms()).controlVariable).to.lt(100);
            (0, chai_1.expect)((await daiBond.adjustment()).rate).to.equal(0);
        });
    });
    describe("redeem", () => {
        it("should not redeem before vested", async () => {
            await (0, chai_1.expect)(daiBond.redeem(deployer, false)).to.reverted;
        });
        it("should vest linear", async () => {
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);
            const balanceBefore = await ohm.balanceOf(deployer);
            await (0, testUtils_1.mine)(hardhat_1.default, 3);
            await daiBond.redeem(deployer, false);
            (0, chai_1.expect)(await ohm.balanceOf(deployer)).to.equal(
                balanceBefore.add(10e6 * 4)
            );
        });
        it("should not exceed 100% vest amount", async () => {
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);
            const balanceBefore = await ohm.balanceOf(deployer);
            await (0, testUtils_1.mine)(hardhat_1.default, 1050);
            await daiBond.redeem(deployer, false);
            (0, chai_1.expect)(await ohm.balanceOf(deployer)).to.equal(
                balanceBefore.add(10e9)
            );
        });
        it("should stake using staking helper", async () => {
            await daiBond.setStaking(stakingHelper.address, true);
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);
            const balanceBefore = await sohm.balanceOf(deployer);
            await (0, testUtils_1.mine)(hardhat_1.default, 3);
            await daiBond.redeem(deployer, true);
            (0, chai_1.expect)(await sohm.balanceOf(deployer)).to.equal(
                balanceBefore.add(10e6 * 4)
            );
        });
        it("should stake without staking helper", async () => {
            await daiBond.setStaking(staking.address, false);
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);
            const balanceBefore = await sohm.balanceOf(deployer);
            await (0, testUtils_1.mine)(hardhat_1.default, 3);
            await daiBond.redeem(deployer, true);
            await staking.claim(deployer);
            (0, chai_1.expect)(await sohm.balanceOf(deployer)).to.equal(
                balanceBefore.add(10e6 * 4)
            );
        });
    });
});
