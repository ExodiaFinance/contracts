import { FakeContract, MockContract, smock } from "@defi-wonderland/smock";
import { expect } from "chai";
import { BigNumber, ethers } from "ethers";
import hre from "hardhat";

import { TREASURY_DID } from "../deploy/03_deployTreasury";
import { STAKING_DID } from "../deploy/05_deployStaking";
import { STAKING_HELPER_DID } from "../deploy/07_deployStakingHelper";
import { OHM_CIRCULATING_SUPPLY_DID } from "../deploy/14_deployOhmCirculatingSupply";
import { MINT_OHM_DID } from "../deploy/16_mintOHM";
import { WOHM_DID } from "../deploy/17_deployWOHM";
import { GOHM_ORACLE_DID } from "../deploy/21_deployGOHMPriceOracle";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import toggleRights, { MANAGING } from "../packages/utils/toggleRights";
import { OHM_DECIMALS, toWei, ZERO_ADDRESS } from "../packages/utils/utils";
import {
    AggregatorV3Interface,
    AggregatorV3Interface__factory,
    BackingPriceCalculator,
    BackingPriceCalculator__factory,
    DAI,
    DAI__factory,
    OHMCirculatingSupplyContract,
    OHMCirculatingSupplyContract__factory,
    OlympusERC20Token,
    OlympusERC20Token__factory,
    OlympusStaking,
    OlympusStaking__factory,
    OlympusTreasury,
    OlympusTreasury__factory,
    PriceProvider,
    PriceProvider__factory,
    SOlympus,
    SOlympus__factory,
    StakingHelperV2,
    StakingHelperV2__factory,
    WOHM,
    WOHM__factory,
    WrappedBondDepository,
    WrappedBondDepository__factory,
} from "../packages/sdk/typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { mine } from "./testUtils";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, deploy, getNamedAccounts } = xhre;

describe("GOHM wrapped bond depository", function () {
    let user: SignerWithAddress;
    let deployer: string;
    let dao: string;
    let ohm: OlympusERC20Token;
    let bond: WrappedBondDepository;
    let feed: FakeContract<AggregatorV3Interface>;
    let treasury: OlympusTreasury;
    let wohm: WOHM;
    let sohm: SOlympus;
    let staking: OlympusStaking;
    let stakingHelper: StakingHelperV2;
    let dai: DAI;
    let bcv: number;
    let initialDebt: string;
    let assetPriceUsd: BigNumber;
    let supplyContract: OHMCirculatingSupplyContract;
    let backingPriceCalculator: MockContract<BackingPriceCalculator>;
    let priceProvider: MockContract<PriceProvider>;

    beforeEach(async function () {
        [, user] = await hre.ethers.getSigners();

        await deployments.fixture([
            STAKING_DID,
            STAKING_HELPER_DID,
            TREASURY_DID,
            GOHM_ORACLE_DID,
            MINT_OHM_DID,
            WOHM_DID,
            OHM_CIRCULATING_SUPPLY_DID,
        ]);
        const accounts = await getNamedAccounts();
        deployer = accounts.deployer;
        dao = accounts.DAO;
        const ohmDeployment = await get<OlympusERC20Token__factory>("OlympusERC20Token");
        ohm = ohmDeployment.contract;
        const daiDeploy = await get<DAI__factory>("DAI");
        dai = daiDeploy.contract;
        const treasuryDeployment = await get<OlympusTreasury__factory>("OlympusTreasury");
        treasury = treasuryDeployment.contract;
        const wOHMDeployment = await get<WOHM__factory>("wOHM");
        wohm = wOHMDeployment.contract;
        const excess = ethers.utils.parseUnits("10000", "ether");
        await dai.mint(deployer, excess);
        await dai.approve(treasury.address, excess);
        await treasury.deposit(excess, dai.address, excess.div(1e9));
        const circSupplyDeployment = await get<OHMCirculatingSupplyContract__factory>(
            "OHMCirculatingSupplyContract"
        );
        supplyContract = circSupplyDeployment.contract;
        feed = await smock.fake<AggregatorV3Interface>(
            AggregatorV3Interface__factory.abi
        );
        assetPriceUsd = BigNumber.from("2000");
        feed.latestRoundData.returns([0, assetPriceUsd.mul(1e6), 0, 0, 0]);
        // feed = feedDeployment.contract;
        const wrappedBondDeployment = await deploy<WrappedBondDepository__factory>(
            "WrappedBondDepository",
            [ohm.address, dai.address, treasury.address, dao, feed.address, wohm.address]
        );
        bond = wrappedBondDeployment.contract;

        const stakingDeployment = await get<OlympusStaking__factory>("OlympusStaking");
        staking = stakingDeployment.contract;

        const stakingHelperDeployment = await get<StakingHelperV2__factory>(
            "StakingHelperV2"
        );
        stakingHelper = stakingHelperDeployment.contract;

        const sohmDeployment = await get<SOlympus__factory>("sOlympus");
        sohm = sohmDeployment.contract;

        await bond.setStaking(stakingHelper.address, true);
        await toggleRights(treasury, MANAGING.REWARDMANAGER, bond.address);
        bcv = 100;
        const minPrice = 1000000000; // toWei(1, OHM_DECIMALS);
        const maxPayout = toWei(30, OHM_DECIMALS);
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

        const BackingPriceCalculator = await smock.mock<BackingPriceCalculator__factory>(
            "BackingPriceCalculator"
        );
        backingPriceCalculator = await BackingPriceCalculator.deploy();

        const PriceProvider = await smock.mock<PriceProvider__factory>("PriceProvider");
        priceProvider = await PriceProvider.deploy();

        await bond.setPriceProviders(
            backingPriceCalculator.address,
            priceProvider.address
        );
        backingPriceCalculator.getBackingPrice.returns(ethers.utils.parseUnits("1"));
        priceProvider.getSafePrice.returns(ethers.utils.parseUnits("1"));
    });

    it("Should return bond price in usd", async function () {
        const usdPrice = await bond.bondPriceInUSD();
        const bondPrice = await bond.bondPrice();
        expect(usdPrice).to.eq(ethers.utils.parseUnits(assetPriceUsd.toString()));
        expect(bondPrice).to.eq(1000000000); // 100 is minimum price
    });

    it("Should return the debtRatio", async function () {
        const debtRatio0 = await bond.debtRatio();
        expect(debtRatio0.toString()).eq(initialDebt);
        const bondPriceUsd = await bond.bondPriceInUSD();
        await dai.mint(deployer, bondPriceUsd);
        await dai.approve(bond.address, bondPriceUsd);
        await bond.deposit(bondPriceUsd, bondPriceUsd, deployer);
        const debtRatio1 = await bond.debtRatio();
        const currentDebt = await bond.currentDebt();
        const circulatingSupply = await supplyContract.OHMCirculatingSupply();
        expect(bondPriceUsd.div(1e9).toString()).to.eq(currentDebt.toString());
        expect(debtRatio1.toString()).to.eq(
            bondPriceUsd.div(circulatingSupply).toString()
        );
    });

    it("Verify dai is a reserve token", async function () {
        const isReserve = await treasury.isReserveToken(dai.address);
        expect(isReserve).to.be.true;
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
        expect(debtPostBond.sub(debtPreBond).toString()).to.eq(
            assetPriceUsd.mul(1e9).toString()
        );
    });

    it("Should compute bondPrice", async function () {
        const bondPrice0 = await bond.bondPrice();
        const debtRatio0 = await bond.debtRatio();
        expect(bondPrice0.toString()).to.eq("1000000000");
        let bondAmount = await bond.bondPriceInUSD();
        await dai.mint(deployer, bondAmount);
        await dai.approve(bond.address, bondAmount);
        await bond.deposit(bondAmount, bondPrice0, deployer);
        const debtRatio1 = await bond.debtRatio();
        const bondPrice1 = await bond.bondPrice();
        expect(debtRatio1.toNumber()).greaterThan(debtRatio0.toNumber());
        expect(bondPrice1.toString()).to.eq(debtRatio1.mul(bcv).toString());
    });

    it("Should payout 1 OHM", async function () {
        const bondPrice = await bond.bondPrice();
        const bondPriceUSD = await bond.bondPriceInUSD();
        // @ts-ignore
        const valueOfReturn = (await treasury.functions["valueOf(address,uint256)"](
            dai.address,
            bondPriceUSD
        )) as BigNumber[];
        const valueOfBond = valueOfReturn[0] as BigNumber;
        expect(valueOfBond.toString()).eq(bondPriceUSD.div(1e9).toString());
        const payout = await bond.payoutFor(valueOfBond);
        expect(payout.toString()).to.eq(valueOfBond.mul(1e9).div(bondPrice).toString());
    });

    it("Should sell at min price", async function () {
        await bond.setBondTerms(3, 50_000000000);
        expect(await bond.bondPrice()).to.eq(50_000000000);
        const payout = await bond.payoutFor(10000e9);
        expect(payout).to.eq(200e9);
    });

    it("Should set bond terms", async function () {
        // only policy
        await expect(bond.connect(user).setBondTerms(0, 0)).to.revertedWith(
            "Ownable: caller is not the owner"
        );

        // vestingTerm
        await expect(bond.setBondTerms(0, 1000)).to.revertedWith(
            "Vesting must be longer than 36 hours"
        );
        await bond.setBondTerms(0, 10001);
        expect((await bond.terms()).vestingTerm).to.equal(10001);

        // maxPayout
        await expect(bond.setBondTerms(1, 1001)).to.revertedWith(
            "Payout cannot be above 1 percent"
        );
        await bond.setBondTerms(1, 999);
        expect((await bond.terms()).maxPayout).to.equal(999);

        // maxDebt
        await bond.setBondTerms(2, 10001);
        expect((await bond.terms()).maxDebt).to.equal(10001);

        // minimumPrice
        await bond.setBondTerms(3, 10001);
        expect((await bond.terms()).minimumPrice).to.equal(10001);
    });

    it("Should set adjustment", async function () {
        // only policy
        await expect(bond.connect(user).setAdjustment(true, 0, 0, 0)).to.revertedWith(
            "Ownable: caller is not the owner"
        );

        await bond.setAdjustment(true, 1, 110, 10);

        expect((await bond.adjustment()).add).to.equal(true);
        expect((await bond.adjustment()).rate).to.equal(1);
        expect((await bond.adjustment()).target).to.equal(110);
        expect((await bond.adjustment()).buffer).to.equal(10);
    });

    it("Should set contract for auto stake", async function () {
        // only policy
        await expect(bond.connect(user).setStaking(ZERO_ADDRESS, true)).to.revertedWith(
            "Ownable: caller is not the owner"
        );

        await expect(bond.setStaking(ZERO_ADDRESS, true)).to.reverted;

        await bond.setStaking(user.address, true);
        expect(await bond.useHelper()).to.equal(true);
        expect(await bond.stakingHelper()).to.equal(user.address);

        await bond.setStaking(user.address, false);
        expect(await bond.useHelper()).to.equal(false);
        expect(await bond.staking()).to.equal(user.address);
    });

    describe("deposit", () => {
        it("invalid depositor", async () => {
            await expect(
                bond.deposit(0, await bond.bondPrice(), ZERO_ADDRESS)
            ).to.revertedWith("Invalid address");
        });

        it("Max capacity reached", async () => {
            // set maxDebt to zero
            await bond.setBondTerms(2, 0);

            const bondAmount = ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(bond.address, bondAmount);
            await bond.deposit(bondAmount, await bond.bondPrice(), deployer);

            await expect(
                bond.deposit(0, await bond.bondPrice(), deployer)
            ).to.revertedWith("Max capacity reached");
        });

        it("Slippage limit: more than max price", async () => {
            await expect(
                bond.deposit(0, (await bond.bondPrice()).sub(1), deployer)
            ).to.revertedWith("Slippage limit: more than max price");
        });

        it("Bond too small", async () => {
            await expect(
                bond.deposit(0, await bond.bondPrice(), deployer)
            ).to.revertedWith("Bond too small");
        });

        it("Bond too large", async () => {
            // set max payout to zero
            await bond.setBondTerms(1, 0);

            const bondAmount = ethers.utils.parseUnits("10", "ether");
            await expect(
                bond.deposit(bondAmount, await bond.bondPrice(), deployer)
            ).to.revertedWith("Bond too large");
        });

        it("should receive correct amount after deposit (include treasury)", async () => {
            const bondAmount = ethers.utils.parseUnits("10", "ether");
            const value = ethers.utils.parseUnits("10", 9);
            const payout = await bond.wOHMPayoutFor(value);

            const depositorBalanceBefore = await wohm.balanceOf(bond.address);
            const daoBalanceBefore = await wohm.balanceOf(dao);
            const treasuryBalanceBefore = await dai.balanceOf(treasury.address);
            const totalDebtBefore = await bond.totalDebt();

            await dai.mint(deployer, bondAmount);
            await dai.approve(bond.address, bondAmount);
            await bond.deposit(bondAmount, await bond.bondPrice(), deployer);

            expect(await wohm.balanceOf(bond.address)).to.equal(
                depositorBalanceBefore.add(payout)
            );
            expect(await wohm.balanceOf(dao)).to.equal(daoBalanceBefore);
            expect(await bond.totalDebt()).to.equal(totalDebtBefore.add(value));
            expect((await bond.bondInfo(deployer)).payout).to.equal(payout);
            expect(await dai.balanceOf(treasury.address)).to.equal(
                treasuryBalanceBefore.add(bondAmount)
            );
        });

        it("should decay debt at next deposit", async () => {
            const bondAmount = ethers.utils.parseUnits("10", "ether");
            const value = ethers.utils.parseUnits("10", 9);

            await dai.mint(deployer, bondAmount);
            await dai.approve(bond.address, bondAmount);
            await bond.deposit(bondAmount, await bond.bondPrice(), deployer);

            expect(await bond.totalDebt()).to.equal(value);

            await dai.mint(deployer, bondAmount);
            await dai.approve(bond.address, bondAmount);
            await bond.deposit(bondAmount, await bond.bondPrice(), deployer);

            expect(await bond.totalDebt()).to.lt(value.mul(2));
        });

        it("should increase control variable based on adjustment params", async () => {
            await bond.setAdjustment(true, 1, 110, 2);

            expect((await bond.terms()).controlVariable).to.equal(100);

            const bondAmount = ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(bond.address, bondAmount);
            await bond.deposit(bondAmount, await bond.bondPrice(), deployer);

            expect((await bond.terms()).controlVariable).to.gt(100);
        });

        it("should decrease control variable based on adjustment params", async () => {
            await bond.setAdjustment(false, 1, 90, 2);

            expect((await bond.terms()).controlVariable).to.equal(100);

            const bondAmount = ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(bond.address, bondAmount);
            await bond.deposit(bondAmount, await bond.bondPrice(), deployer);

            expect((await bond.terms()).controlVariable).to.lt(100);
        });

        it("should stop adjustment after control variable reaches target", async () => {
            await bond.setAdjustment(false, 1, 99, 2);

            expect((await bond.terms()).controlVariable).to.equal(100);
            expect((await bond.adjustment()).rate).to.equal(1);

            const bondAmount = ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(bond.address, bondAmount);
            await bond.deposit(bondAmount, await bond.bondPrice(), deployer);

            expect((await bond.terms()).controlVariable).to.lt(100);
            expect((await bond.adjustment()).rate).to.equal(0);
        });
    });

    describe("redeem", () => {
        it("should not redeem before vested", async () => {
            await expect(bond.redeem(deployer, false)).to.reverted;
        });

        it("should vest linear", async () => {
            const bondAmount = ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(bond.address, bondAmount);
            await bond.deposit(bondAmount, await bond.bondPrice(), deployer);

            const balanceBefore = await wohm.balanceOf(deployer);

            await mine(hre, 3);
            await bond.redeem(deployer, false);

            expect(await wohm.balanceOf(deployer)).to.equal(
                balanceBefore.add(ethers.utils.parseUnits("0.04"))
            );
        });

        it("should not exceed 100% vest amount", async () => {
            const bondAmount = ethers.utils.parseUnits("10", "ether");
            await dai.mint(deployer, bondAmount);
            await dai.approve(bond.address, bondAmount);
            await bond.deposit(bondAmount, await bond.bondPrice(), deployer);

            const balanceBefore = await wohm.balanceOf(deployer);

            await mine(hre, 1050);
            await bond.redeem(deployer, false);

            expect(await wohm.balanceOf(deployer)).to.equal(
                balanceBefore.add(ethers.utils.parseUnits("10"))
            );
        });
    });
});
