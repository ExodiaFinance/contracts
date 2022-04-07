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
const smock_1 = require("@defi-wonderland/smock");
const chai_1 = require("chai");
const ethers_1 = require("ethers");
const hardhat_1 = __importDefault(require("hardhat"));
const _03_deployTreasury_1 = require("../deploy/03_deployTreasury");
const _05_deployStaking_1 = require("../deploy/05_deployStaking");
const _07_deployStakingHelper_1 = require("../deploy/07_deployStakingHelper");
const _14_deployOhmCirculatingSupply_1 = require("../deploy/14_deployOhmCirculatingSupply");
const _16_mintOHM_1 = require("../deploy/16_mintOHM");
const _21_deployGOHMPriceOracle_1 = require("../deploy/21_deployGOHMPriceOracle");
const toggleRights_1 = __importStar(require("../packages/utils/toggleRights"));
const utils_1 = require("../packages/utils/utils");
const typechain_1 = require("../packages/sdk/typechain");
const testUtils_1 = require("./testUtils");
const xhre = hardhat_1.default;
const { deployments, get, deploy, getNamedAccounts } = xhre;
describe("GOHM bond depository", function () {
    let user;
    let deployer;
    let dao;
    let ohm;
    let bond;
    let feed;
    let treasury;
    let sohm;
    let staking;
    let stakingHelper;
    let dai;
    let bcv;
    let initialDebt;
    let assetPriceUsd;
    let supplyContract;
    beforeEach(async function () {
        [, user] = await hardhat_1.default.ethers.getSigners();
        await deployments.fixture([
            _05_deployStaking_1.STAKING_DID,
            _07_deployStakingHelper_1.STAKING_HELPER_DID,
            _03_deployTreasury_1.TREASURY_DID,
            _21_deployGOHMPriceOracle_1.GOHM_ORACLE_DID,
            _16_mintOHM_1.MINT_OHM_DID,
            _14_deployOhmCirculatingSupply_1.OHM_CIRCULATING_SUPPLY_DID,
        ]);
        const accounts = await getNamedAccounts();
        deployer = accounts.deployer;
        dao = accounts.DAO;
        const ohmDeployment = await get("OlympusERC20Token");
        ohm = ohmDeployment.contract;
        const daiDeploy = await get("DAI");
        dai = daiDeploy.contract;
        const treasuryDeployment = await get("OlympusTreasury");
        treasury = treasuryDeployment.contract;
        const excess = ethers_1.ethers.utils.parseUnits("10000", "ether");
        await dai.mint(deployer, excess);
        await dai.approve(treasury.address, excess);
        await treasury.deposit(excess, dai.address, excess.div(1e9));
        const circSupplyDeployment = await get("OHMCirculatingSupplyContract");
        supplyContract = circSupplyDeployment.contract;
        feed = await smock_1.smock.fake(typechain_1.AggregatorV3Interface__factory.abi);
        assetPriceUsd = ethers_1.BigNumber.from("2000");
        feed.latestRoundData.returns([0, assetPriceUsd.mul(1e6), 0, 0, 0]);
        // feed = feedDeployment.contract;
        const gohmDeployment = await deploy("GOHMBondDepository", [
            ohm.address,
            dai.address,
            treasury.address,
            dao,
            feed.address,
        ]);
        bond = gohmDeployment.contract;
        const stakingDeployment = await get("OlympusStaking");
        staking = stakingDeployment.contract;
        const stakingHelperDeployment = await get("StakingHelperV2");
        stakingHelper = stakingHelperDeployment.contract;
        const sohmDeployment = await get("sOlympus");
        sohm = sohmDeployment.contract;
        await bond.setStaking(stakingHelper.address, true);
        await (0,
        toggleRights_1.default)(treasury, toggleRights_1.MANAGING.REWARDMANAGER, bond.address);
        bcv = 100;
        const minPrice = 100; // toWei(1, OHM_DECIMALS);
        const maxPayout = (0, utils_1.toWei)(30, utils_1.OHM_DECIMALS);
        const maxDebt = "10000000000000000"; // toWei(100, DAI_DECIMALS);
        initialDebt = "0";
        await bond.initializeBondTerms(
            bcv,
            1000,
            minPrice,
            maxPayout,
            maxDebt,
            initialDebt
        );
    });
    it("Should return bond price in usd", async function () {
        const usdPrice = await bond.bondPriceInUSD();
        const bondPrice = await bond.bondPrice();
        (0, chai_1.expect)(usdPrice.toString()).to.eq(assetPriceUsd.mul(1e14).toString());
        (0, chai_1.expect)(bondPrice.toString()).to.eq("100"); // 100 is minimum price
    });
    it("Should return the debtRatio", async function () {
        const debtRatio0 = await bond.debtRatio();
        (0, chai_1.expect)(debtRatio0.toString()).eq(initialDebt);
        const bondPriceUsd = await bond.bondPriceInUSD();
        await dai.mint(deployer, bondPriceUsd);
        await dai.approve(bond.address, bondPriceUsd);
        await bond.deposit(bondPriceUsd, bondPriceUsd, deployer);
        const debtRatio1 = await bond.debtRatio();
        const currentDebt = await bond.currentDebt();
        const circulatingSupply = await supplyContract.OHMCirculatingSupply();
        (0, chai_1.expect)(bondPriceUsd.div(1e9).toString()).to.eq(
            currentDebt.toString()
        );
        (0, chai_1.expect)(debtRatio1.toString()).to.eq(
            bondPriceUsd.div(circulatingSupply).toString()
        );
    });
    it("Verify dai is a reserve token", async function () {
        const isReserve = await treasury.isReserveToken(dai.address);
        (0, chai_1.expect)(isReserve).to.be.true;
    });
    it("Should be able to gOHM bond", async function () {
        const bondPrice = await bond.bondPriceInUSD();
        await dai.mint(deployer, bondPrice);
        await dai.approve(bond.address, bondPrice);
        await bond.deposit(bondPrice, bondPrice.mul(110).div(100), deployer);
    });
    it("Should increase debt", async function () {
        const bondPriceUSD = await bond.bondPriceInUSD();
        const bondAmount = bondPriceUSD;
        await dai.mint(deployer, bondAmount);
        await dai.approve(bond.address, bondAmount);
        const debtPreBond = await bond.currentDebt();
        await bond.deposit(bondAmount, bondPriceUSD, deployer);
        const debtPostBond = await bond.currentDebt();
        (0, chai_1.expect)(debtPostBond.sub(debtPreBond).toString()).to.eq(
            assetPriceUsd.mul(1e5).toString()
        );
    });
    it("Should compute bondPrice", async function () {
        const bondPrice0 = await bond.bondPrice();
        const debtRatio0 = await bond.debtRatio();
        (0, chai_1.expect)(bondPrice0.toString()).to.eq("100");
        let bondAmount = await bond.bondPriceInUSD();
        bondAmount = bondAmount.mul(30);
        await dai.mint(deployer, bondAmount);
        await dai.approve(bond.address, bondAmount);
        await bond.deposit(bondAmount, bondPrice0, deployer);
        const debtRatio1 = await bond.debtRatio();
        const bondPrice1 = await bond.bondPrice();
        (0, chai_1.expect)(debtRatio1.toNumber()).greaterThan(debtRatio0.toNumber());
        (0, chai_1.expect)(bondPrice1.toString()).to.eq(
            debtRatio1.mul(bcv).div(1e5).toString()
        );
    });
    it("Should payout 1 OHM", async function () {
        const bondPrice = await bond.bondPrice();
        const bondPriceUSD = await bond.bondPriceInUSD();
        // @ts-ignore
        const valueOfReturn = await treasury.functions["valueOf(address,uint256)"](
            dai.address,
            bondPriceUSD
        );
        const valueOfBond = valueOfReturn[0];
        (0, chai_1.expect)(valueOfBond.toString()).eq(bondPriceUSD.div(1e9).toString());
        const payout = await bond.payoutFor(valueOfBond);
        (0, chai_1.expect)(payout.toString()).to.eq(
            valueOfBond.mul(1e4).div(bondPrice).toString()
        );
    });
    it("Should sell at min price", async function () {
        await bond.setBondTerms(3, 500000);
        (0, chai_1.expect)(await bond.bondPrice()).to.eq(500000);
        const payout = await bond.payoutFor(10000e9);
        (0, chai_1.expect)(payout).to.eq(200e9);
    });
    it("Should set bond terms", async function () {
        // only policy
        await (0, chai_1.expect)(bond.connect(user).setBondTerms(0, 0)).to.revertedWith(
            "Ownable: caller is not the owner"
        );
        // vestingTerm
        await (0, chai_1.expect)(bond.setBondTerms(0, 1000)).to.revertedWith(
            "Vesting must be longer than 36 hours"
        );
        await bond.setBondTerms(0, 10001);
        (0, chai_1.expect)((await bond.terms()).vestingTerm).to.equal(10001);
        // maxPayout
        await (0, chai_1.expect)(bond.setBondTerms(1, 1001)).to.revertedWith(
            "Payout cannot be above 1 percent"
        );
        await bond.setBondTerms(1, 999);
        (0, chai_1.expect)((await bond.terms()).maxPayout).to.equal(999);
        // maxDebt
        await bond.setBondTerms(2, 10001);
        (0, chai_1.expect)((await bond.terms()).maxDebt).to.equal(10001);
        // minimumPrice
        await bond.setBondTerms(3, 10001);
        (0, chai_1.expect)((await bond.terms()).minimumPrice).to.equal(10001);
    });
    it("Should set adjustment", async function () {
        // only policy
        await (0, chai_1.expect)(
            bond.connect(user).setAdjustment(true, 0, 0, 0)
        ).to.revertedWith("Ownable: caller is not the owner");
        await bond.setAdjustment(true, 1, 110, 10);
        (0, chai_1.expect)((await bond.adjustment()).add).to.equal(true);
        (0, chai_1.expect)((await bond.adjustment()).rate).to.equal(1);
        (0, chai_1.expect)((await bond.adjustment()).target).to.equal(110);
        (0, chai_1.expect)((await bond.adjustment()).buffer).to.equal(10);
    });
    it("Should set contract for auto stake", async function () {
        // only policy
        await (0, chai_1.expect)(
            bond.connect(user).setStaking(utils_1.ZERO_ADDRESS, true)
        ).to.revertedWith("Ownable: caller is not the owner");
        await (0, chai_1.expect)(bond.setStaking(utils_1.ZERO_ADDRESS, true)).to.reverted;
        await bond.setStaking(user.address, true);
        (0, chai_1.expect)(await bond.useHelper()).to.equal(true);
        (0, chai_1.expect)(await bond.stakingHelper()).to.equal(user.address);
        await bond.setStaking(user.address, false);
        (0, chai_1.expect)(await bond.useHelper()).to.equal(false);
        (0, chai_1.expect)(await bond.staking()).to.equal(user.address);
    });
    describe("deposit", () => {
        it("invalid depositor", async () => {
            await (0, chai_1.expect)(
                bond.deposit(0, await bond.bondPrice(), utils_1.ZERO_ADDRESS)
            ).to.revertedWith("Invalid address");
        });
        it("Max capacity reached", async () => {
            // set maxDebt to zero
            await bond.setBondTerms(2, 0);
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(bond.address, bondAmount);
            await bond.deposit(bondAmount, await bond.bondPrice(), deployer);
            await (0, chai_1.expect)(
                bond.deposit(0, await bond.bondPrice(), deployer)
            ).to.revertedWith("Max capacity reached");
        });
        it("Slippage limit: more than max price", async () => {
            await (0, chai_1.expect)(
                bond.deposit(0, (await bond.bondPrice()).sub(1), deployer)
            ).to.revertedWith("Slippage limit: more than max price");
        });
        it("Bond too small", async () => {
            await (0, chai_1.expect)(
                bond.deposit(0, await bond.bondPrice(), deployer)
            ).to.revertedWith("Bond too small");
        });
        it("Bond too large", async () => {
            // set max payout to zero
            await bond.setBondTerms(1, 0);
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            await (0, chai_1.expect)(
                bond.deposit(bondAmount, await bond.bondPrice(), deployer)
            ).to.revertedWith("Bond too large");
        });
        it("should receive correct amount after deposit (include treasury)", async () => {
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            const value = ethers_1.ethers.utils.parseUnits("10", 9);
            const payout = await bond.payoutFor(value);
            const depositorBalanceBefore = await ohm.balanceOf(bond.address);
            const daoBalanceBefore = await ohm.balanceOf(dao);
            const treasuryBalanceBefore = await dai.balanceOf(treasury.address);
            const totalDebtBefore = await bond.totalDebt();
            await dai.mint(deployer, bondAmount);
            await dai.approve(bond.address, bondAmount);
            await bond.deposit(bondAmount, await bond.bondPrice(), deployer);
            (0, chai_1.expect)(await ohm.balanceOf(bond.address)).to.equal(
                depositorBalanceBefore.add(payout)
            );
            (0, chai_1.expect)(await ohm.balanceOf(dao)).to.equal(daoBalanceBefore);
            (0, chai_1.expect)(await bond.totalDebt()).to.equal(
                totalDebtBefore.add(value)
            );
            (0, chai_1.expect)((await bond.bondInfo(deployer)).payout).to.equal(payout);
            (0, chai_1.expect)(await dai.balanceOf(treasury.address)).to.equal(
                treasuryBalanceBefore.add(bondAmount)
            );
        });
        it("should decay debt at next deposit", async () => {
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            const value = ethers_1.ethers.utils.parseUnits("10", 9);
            await dai.mint(deployer, bondAmount);
            await dai.approve(bond.address, bondAmount);
            await bond.deposit(bondAmount, await bond.bondPrice(), deployer);
            (0, chai_1.expect)(await bond.totalDebt()).to.equal(value);
            await dai.mint(deployer, bondAmount);
            await dai.approve(bond.address, bondAmount);
            await bond.deposit(bondAmount, await bond.bondPrice(), deployer);
            (0, chai_1.expect)(await bond.totalDebt()).to.lt(value.mul(2));
        });
        it("should increase control variable based on adjustment params", async () => {
            await bond.setAdjustment(true, 1, 110, 2);
            (0, chai_1.expect)((await bond.terms()).controlVariable).to.equal(100);
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(bond.address, bondAmount);
            await bond.deposit(bondAmount, await bond.bondPrice(), deployer);
            (0, chai_1.expect)((await bond.terms()).controlVariable).to.gt(100);
        });
        it("should decrease control variable based on adjustment params", async () => {
            await bond.setAdjustment(false, 1, 90, 2);
            (0, chai_1.expect)((await bond.terms()).controlVariable).to.equal(100);
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(bond.address, bondAmount);
            await bond.deposit(bondAmount, await bond.bondPrice(), deployer);
            (0, chai_1.expect)((await bond.terms()).controlVariable).to.lt(100);
        });
        it("should stop adjustment after control variable reaches target", async () => {
            await bond.setAdjustment(false, 1, 99, 2);
            (0, chai_1.expect)((await bond.terms()).controlVariable).to.equal(100);
            (0, chai_1.expect)((await bond.adjustment()).rate).to.equal(1);
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(bond.address, bondAmount);
            await bond.deposit(bondAmount, await bond.bondPrice(), deployer);
            (0, chai_1.expect)((await bond.terms()).controlVariable).to.lt(100);
            (0, chai_1.expect)((await bond.adjustment()).rate).to.equal(0);
        });
    });
    describe("redeem", () => {
        it("should not redeem before vested", async () => {
            await (0, chai_1.expect)(bond.redeem(deployer, false)).to.reverted;
        });
        it("should vest linear", async () => {
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(bond.address, bondAmount);
            await bond.deposit(bondAmount, await bond.bondPrice(), deployer);
            const balanceBefore = await ohm.balanceOf(deployer);
            await (0, testUtils_1.mine)(hardhat_1.default, 3);
            await bond.redeem(deployer, false);
            (0, chai_1.expect)(await ohm.balanceOf(deployer)).to.equal(
                balanceBefore.add(10e8 * 4)
            );
        });
        it("should not exceed 100% vest amount", async () => {
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(bond.address, bondAmount);
            await bond.deposit(bondAmount, await bond.bondPrice(), deployer);
            const balanceBefore = await ohm.balanceOf(deployer);
            await (0, testUtils_1.mine)(hardhat_1.default, 1050);
            await bond.redeem(deployer, false);
            (0, chai_1.expect)(await ohm.balanceOf(deployer)).to.equal(
                balanceBefore.add(10e11)
            );
        });
        it("should stake using staking helper", async () => {
            await bond.setStaking(stakingHelper.address, true);
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(bond.address, bondAmount);
            await bond.deposit(bondAmount, await bond.bondPrice(), deployer);
            const balanceBefore = await sohm.balanceOf(deployer);
            await (0, testUtils_1.mine)(hardhat_1.default, 3);
            await bond.redeem(deployer, true);
            (0, chai_1.expect)(await sohm.balanceOf(deployer)).to.equal(
                balanceBefore.add(10e8 * 4)
            );
        });
        it("should stake without staking helper", async () => {
            await bond.setStaking(staking.address, false);
            const bondAmount = ethers_1.ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(bond.address, bondAmount);
            await bond.deposit(bondAmount, await bond.bondPrice(), deployer);
            const balanceBefore = await sohm.balanceOf(deployer);
            await (0, testUtils_1.mine)(hardhat_1.default, 3);
            await bond.redeem(deployer, true);
            await staking.claim(deployer);
            (0, chai_1.expect)(await sohm.balanceOf(deployer)).to.equal(
                balanceBefore.add(10e8 * 4)
            );
        });
    });
});
