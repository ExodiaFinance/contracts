import { expect } from "chai";
import { BigNumber, ethers } from "ethers";
import hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";

import { DAI_BOND_DID } from "../deploy/11_deployDaiBond";
import { DAI_BOND_SET_STAKING_DID } from "../deploy/12_daiBondSetStaking";
import { ALLOW_DAI_BOND_TREASURY } from "../deploy/13_allowDaiBondsTreasuryAccess";
import { MINT_OHM_DID } from "../deploy/16_mintOHM";
import { STAKING_HELPER_DID } from "../deploy/07_deployStakingHelper";
import { STAKING_DID } from "../deploy/05_deployStaking";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { DAI_DECIMALS, OHM_DECIMALS, toWei, ZERO_ADDRESS } from "../packages/utils/utils";
import {
    DAI,
    DAI__factory,
    DAIBondDepository,
    DAIBondDepository__factory,
    OlympusTreasury__factory,
    OlympusTreasury,
    OlympusERC20Token,
    OlympusERC20Token__factory,
    StakingHelperV2__factory,
    StakingHelperV2,
    OlympusStaking__factory,
    OlympusStaking,
    SOlympus__factory,
    SOlympus,
    BackingPriceCalculator__factory,
    BackingPriceCalculator,
    PriceProvider,
    PriceProvider__factory,
} from "../packages/sdk/typechain";
import { mine } from "./testUtils";
import { MockContract, smock } from "@defi-wonderland/smock";
import { parseUnits } from "ethers/lib/utils";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, deploy, getNamedAccounts } = xhre;
describe("Dai bond depository", function () {
    let user: SignerWithAddress;
    let daiBond: DAIBondDepository;
    let dai: DAI, ohm: OlympusERC20Token;
    let treasury: OlympusTreasury;
    let sohm: SOlympus;
    let staking: OlympusStaking;
    let stakingHelper: StakingHelperV2;
    let deployer: string, dao: string;
    let backingPriceCalculator: MockContract<BackingPriceCalculator>;
    let priceProvider: MockContract<PriceProvider>;
    beforeEach(async function () {
        [, user] = await hre.ethers.getSigners();

        const accounts = await getNamedAccounts();
        deployer = accounts.deployer;
        dao = accounts.DAO;
        await deployments.fixture([
            STAKING_DID,
            STAKING_HELPER_DID,
            DAI_BOND_DID,
            DAI_BOND_SET_STAKING_DID,
            ALLOW_DAI_BOND_TREASURY,
            MINT_OHM_DID,
        ]);
        const daiDeploy = await get<DAI__factory>("DAI");
        dai = daiDeploy.contract;
        const daiBondDeployment = await get<DAIBondDepository__factory>(
            "DAIBondDepository"
        );
        daiBond = daiBondDeployment.contract;

        const stakingDeployment = await get<OlympusStaking__factory>("OlympusStaking");
        staking = stakingDeployment.contract;

        const stakingHelperDeployment = await get<StakingHelperV2__factory>(
            "StakingHelperV2"
        );
        stakingHelper = stakingHelperDeployment.contract;

        const sohmDeployment = await get<SOlympus__factory>("sOlympus");
        sohm = sohmDeployment.contract;

        const treasuryDeployment = await get<OlympusTreasury__factory>("OlympusTreasury");
        treasury = treasuryDeployment.contract;

        const ohmDeployment = await get<OlympusERC20Token__factory>("OlympusERC20Token");
        ohm = ohmDeployment.contract;

        const BackingPriceCalculator = await smock.mock<BackingPriceCalculator__factory>(
            "BackingPriceCalculator"
        );
        backingPriceCalculator = await BackingPriceCalculator.deploy();

        const PriceProvider = await smock.mock<PriceProvider__factory>("PriceProvider");
        priceProvider = await PriceProvider.deploy();

        await daiBond.setPriceProviders(
            backingPriceCalculator.address,
            priceProvider.address
        );
        backingPriceCalculator.getBackingPrice.returns(ethers.utils.parseUnits("1"));
        priceProvider.getSafePrice.returns(ethers.utils.parseUnits("1"));
    });

    it("should be able to bond", async function () {
        const bondAmount = toWei(100, DAI_DECIMALS);
        await dai.mint(deployer, bondAmount);
        await dai.approve(daiBond.address, bondAmount);
        await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);
    });

    it("bond price usd vs bond price", async function () {
        const bondAmount0 = ethers.utils.parseUnits("10", "ether");
        await dai.mint(deployer, bondAmount0);
        await dai.approve(daiBond.address, bondAmount0);
        await daiBond.deposit(bondAmount0, await daiBond.bondPrice(), deployer);
        const bondPrice = await daiBond.bondPrice();
        const bondPriceUSD = await daiBond.bondPriceInUSD();
        expect(bondPrice.toString()).eq(bondPriceUSD.div(1e9).toString());
    });

    it("Should increase debt when bonding", async function () {
        const debt0 = await daiBond.currentDebt();
        const bondAmount0 = ethers.utils.parseUnits("10", "ether");
        await dai.mint(deployer, bondAmount0);
        await dai.approve(daiBond.address, bondAmount0);
        await daiBond.deposit(bondAmount0, await daiBond.bondPrice(), deployer);
        const debt1 = await daiBond.currentDebt();
        // bonds are sold at 1$
        expect(debt1.sub(debt0).toString()).to.eq(bondAmount0.div(1e9).toString());
        const bondAmount1 = ethers.utils.parseUnits("20", "ether");
        await dai.mint(deployer, bondAmount1);
        await dai.approve(daiBond.address, bondAmount1);
        await daiBond.deposit(bondAmount1, await daiBond.bondPrice(), deployer);
        const debt2 = await daiBond.currentDebt();
        expect(debt2.toString()).to.eq(
            bondAmount0
                .add(bondAmount1)
                .sub(bondAmount0.div(1000).mul(3))
                .div(1e9)
                .toString()
        );
    });

    it("Should sell at 1$ price", async function () {
        const payout = await daiBond.payoutFor(1e9);
        expect(payout).to.eq(1e9);
    });

    it("Should sell at min price", async function () {
        await daiBond.setBondTerms(4, parseUnits("2", 9));
        const payout = await daiBond.payoutFor(10e9);
        expect(payout).to.eq(5e9);
    });

    it("Should check backing price", async function () {
        await daiBond.setBondTerms(4, parseUnits("0.5", 9)); // set min price lower than backing price
        const payout = await daiBond.payoutFor(parseUnits("1", 9));
        expect(payout).to.eq(parseUnits("1", 9));
    });

    it("Should set bond terms", async function () {
        // only policy
        await expect(daiBond.connect(user).setBondTerms(0, 0)).to.revertedWith(
            "Ownable: caller is not the owner"
        );

        // vestingTerm
        await expect(daiBond.setBondTerms(0, 1000)).to.revertedWith(
            "Vesting must be longer than 36 hours"
        );
        await daiBond.setBondTerms(0, 10001);
        expect((await daiBond.terms()).vestingTerm).to.equal(10001);

        // maxPayout
        await expect(daiBond.setBondTerms(1, 1001)).to.revertedWith(
            "Payout cannot be above 1 percent"
        );
        await daiBond.setBondTerms(1, 999);
        expect((await daiBond.terms()).maxPayout).to.equal(999);

        // fee
        await expect(daiBond.setBondTerms(2, 10001)).to.revertedWith(
            "DAO fee cannot exceed payout"
        );
        await daiBond.setBondTerms(2, 9999);
        expect((await daiBond.terms()).fee).to.equal(9999);

        // maxDebt
        await daiBond.setBondTerms(3, 10001);
        expect((await daiBond.terms()).maxDebt).to.equal(10001);

        // minimumPrice
        await daiBond.setBondTerms(4, 10001);
        expect((await daiBond.terms()).minimumPrice).to.equal(10001);
    });

    it("Should set adjustment", async function () {
        // only policy
        await expect(daiBond.connect(user).setAdjustment(true, 0, 0, 0)).to.revertedWith(
            "Ownable: caller is not the owner"
        );

        await daiBond.setAdjustment(true, 1, 110, 10);

        expect((await daiBond.adjustment()).add).to.equal(true);
        expect((await daiBond.adjustment()).rate).to.equal(1);
        expect((await daiBond.adjustment()).target).to.equal(110);
        expect((await daiBond.adjustment()).buffer).to.equal(10);
    });

    it("Should set contract for auto stake", async function () {
        // only policy
        await expect(
            daiBond.connect(user).setStaking(ZERO_ADDRESS, true)
        ).to.revertedWith("Ownable: caller is not the owner");

        await expect(daiBond.setStaking(ZERO_ADDRESS, true)).to.reverted;

        await daiBond.setStaking(user.address, true);
        expect(await daiBond.useHelper()).to.equal(true);
        expect(await daiBond.stakingHelper()).to.equal(user.address);

        await daiBond.setStaking(user.address, false);
        expect(await daiBond.useHelper()).to.equal(false);
        expect(await daiBond.staking()).to.equal(user.address);
    });

    describe("deposit", () => {
        it("invalid depositor", async () => {
            await expect(
                daiBond.deposit(0, await daiBond.bondPrice(), ZERO_ADDRESS)
            ).to.revertedWith("Invalid address");
        });

        it("Max capacity reached", async () => {
            // set maxDebt to zero
            await daiBond.setBondTerms(3, 0);

            const bondAmount = ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);

            await expect(
                daiBond.deposit(0, await daiBond.bondPrice(), deployer)
            ).to.revertedWith("Max capacity reached");
        });

        it("Slippage limit: more than max price", async () => {
            await expect(
                daiBond.deposit(0, (await daiBond.bondPrice()).sub(1), deployer)
            ).to.revertedWith("Slippage limit: more than max price");
        });

        it("Bond too small", async () => {
            await expect(
                daiBond.deposit(0, await daiBond.bondPrice(), deployer)
            ).to.revertedWith("Bond too small");
        });

        it("Bond too large", async () => {
            // set max payout to zero
            await daiBond.setBondTerms(1, 0);

            const bondAmount = ethers.utils.parseUnits("10", "ether");
            await expect(
                daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer)
            ).to.revertedWith("Bond too large");
        });

        it("should receive correct amount after deposit (include treasury)", async () => {
            const bondAmount = ethers.utils.parseUnits("10", "ether");
            const value = ethers.utils.parseUnits("10", 9);
            const payout = await daiBond.payoutFor(value);
            const fee = payout.mul((await daiBond.terms()).fee).div(10000);

            const depositorBalanceBefore = await ohm.balanceOf(daiBond.address);
            const daoBalanceBefore = await ohm.balanceOf(dao);
            const treasuryBalanceBefore = await dai.balanceOf(treasury.address);
            const totalDebtBefore = await daiBond.totalDebt();

            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);

            expect(await ohm.balanceOf(daiBond.address)).to.equal(
                depositorBalanceBefore.add(payout)
            );
            expect(await ohm.balanceOf(dao)).to.equal(daoBalanceBefore.add(fee));
            expect(await daiBond.totalDebt()).to.equal(totalDebtBefore.add(value));
            expect((await daiBond.bondInfo(deployer)).payout).to.equal(payout);
            expect(await dai.balanceOf(treasury.address)).to.equal(
                treasuryBalanceBefore.add(bondAmount)
            );
        });

        it("should decay debt at next deposit", async () => {
            const bondAmount = ethers.utils.parseUnits("10", "ether");
            const value = ethers.utils.parseUnits("10", 9);

            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);

            expect(await daiBond.totalDebt()).to.equal(value);

            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);

            expect(await daiBond.totalDebt()).to.lt(value.mul(2));
        });

        it("should increase control variable based on adjustment params", async () => {
            await daiBond.setAdjustment(true, 1, 110, 2);

            expect((await daiBond.terms()).controlVariable).to.equal(100);

            const bondAmount = ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);

            expect((await daiBond.terms()).controlVariable).to.gt(100);
        });

        it("should decrease control variable based on adjustment params", async () => {
            await daiBond.setAdjustment(false, 1, 90, 2);

            expect((await daiBond.terms()).controlVariable).to.equal(100);

            const bondAmount = ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);

            expect((await daiBond.terms()).controlVariable).to.lt(100);
        });

        it("should stop adjustment after control variable reaches target", async () => {
            await daiBond.setAdjustment(false, 1, 99, 2);

            expect((await daiBond.terms()).controlVariable).to.equal(100);
            expect((await daiBond.adjustment()).rate).to.equal(1);

            const bondAmount = ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);

            expect((await daiBond.terms()).controlVariable).to.lt(100);
            expect((await daiBond.adjustment()).rate).to.equal(0);
        });
    });

    describe("redeem", () => {
        it("should not redeem before vested", async () => {
            await expect(daiBond.redeem(deployer, false)).to.reverted;
        });

        it("should vest linear", async () => {
            const bondAmount = ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);

            const balanceBefore = await ohm.balanceOf(deployer);

            await mine(hre, 3);
            await daiBond.redeem(deployer, false);

            expect(await ohm.balanceOf(deployer)).to.equal(balanceBefore.add(10e6 * 4));
        });

        it("should not exceed 100% vest amount", async () => {
            const bondAmount = ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);

            const balanceBefore = await ohm.balanceOf(deployer);

            await mine(hre, 1050);
            await daiBond.redeem(deployer, false);

            expect(await ohm.balanceOf(deployer)).to.equal(balanceBefore.add(10e9));
        });

        it("should stake using staking helper", async () => {
            await daiBond.setStaking(stakingHelper.address, true);

            const bondAmount = ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);

            const balanceBefore = await sohm.balanceOf(deployer);

            await mine(hre, 3);
            await daiBond.redeem(deployer, true);

            expect(await sohm.balanceOf(deployer)).to.equal(balanceBefore.add(10e6 * 4));
        });

        it("should stake without staking helper", async () => {
            await daiBond.setStaking(staking.address, false);

            const bondAmount = ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(daiBond.address, bondAmount);
            await daiBond.deposit(bondAmount, await daiBond.bondPrice(), deployer);

            const balanceBefore = await sohm.balanceOf(deployer);

            await mine(hre, 3);
            await daiBond.redeem(deployer, true);
            await staking.claim(deployer);

            expect(await sohm.balanceOf(deployer)).to.equal(balanceBefore.add(10e6 * 4));
        });
    });
});
