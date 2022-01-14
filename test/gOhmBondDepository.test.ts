import { FakeContract, smock } from "@defi-wonderland/smock";
import { expect } from "chai";
import { BigNumber, ethers } from "ethers";
import hre from "hardhat";

import { TREASURY_DID } from "../deploy/03_deployTreasury";
import { OHM_CIRCULATING_SUPPLY_DID } from "../deploy/14_deployOhmCirculatingSupply";
import { MINT_OHM_DID } from "../deploy/16_mintOHM";
import { GOHM_ORACLE_DID } from "../deploy/21_deployGOHMSpotPriceOracle";
import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import toggleRights, { MANAGING } from "../src/subdeploy/toggleRights";
import { OHM_DECIMALS, toWei } from "../src/utils";
import {
    DAI,
    DAI__factory,
    GOHMBondDepository,
    GOHMBondDepository__factory,
    GOHMSpotPriceOracle,
    OHMCirculatingSupplyContract,
    OHMCirculatingSupplyContract__factory,
    OlympusERC20Token__factory,
    OlympusTreasury,
    OlympusTreasury__factory,
    StakingHelperV2__factory,
} from "../typechain";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, deploy, getNamedAccounts } = xhre;

describe("GOHM bond depository", function () {
    let bond: GOHMBondDepository;
    let feed: FakeContract<GOHMSpotPriceOracle>;
    let treasury: OlympusTreasury;
    let dai: DAI;
    let deployer: string;
    let bcv: number;
    let initialDebt: string;
    let assetPriceUsd: BigNumber;
    let supplyContract: OHMCirculatingSupplyContract;
    beforeEach(async function () {
        await deployments.fixture([
            TREASURY_DID,
            GOHM_ORACLE_DID,
            MINT_OHM_DID,
            OHM_CIRCULATING_SUPPLY_DID,
        ]);
        const accounts = await getNamedAccounts();
        deployer = accounts.deployer;
        const { contract: ohm } = await get<OlympusERC20Token__factory>(
            "OlympusERC20Token"
        );
        const daiDeploy = await get<DAI__factory>("DAI");
        dai = daiDeploy.contract;
        const treasuryDeployment = await get<OlympusTreasury__factory>("OlympusTreasury");
        treasury = treasuryDeployment.contract;
        const excess = ethers.utils.parseUnits("10000", "ether");
        await dai.mint(deployer, excess);
        await dai.approve(treasury.address, excess);
        await treasury.deposit(excess, dai.address, excess.div(1e9));
        const { DAO } = await getNamedAccounts();
        const circSupplyDeployment = await get<OHMCirculatingSupplyContract__factory>(
            "OHMCirculatingSupplyContract"
        );
        supplyContract = circSupplyDeployment.contract;
        feed = await smock.fake<GOHMSpotPriceOracle>("GOHMSpotPriceOracle");
        assetPriceUsd = BigNumber.from("2000");
        feed.latestRoundData.returns([0, assetPriceUsd.mul(1e6), 0, 0, 0]);
        feed.latestAnswer.returns(assetPriceUsd.mul(1e6));
        // feed = feedDeployment.contract;
        const { contract, deployment } = await deploy<GOHMBondDepository__factory>(
            "GOHMBondDepository",
            [ohm.address, dai.address, treasury.address, DAO, feed.address]
        );
        bond = contract;
        const { contract: stakingHelper } = await get<StakingHelperV2__factory>(
            "StakingHelperV2"
        );
        await bond.setStaking(stakingHelper.address, true);
        await toggleRights(treasury, MANAGING.REWARDMANAGER, bond.address);
        bcv = 100;
        const minPrice = 100; // toWei(1, OHM_DECIMALS);
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
    });

    it("Should return bond price in usd", async function () {
        const usdPrice = await bond.bondPriceInUSD();
        const bondPrice = await bond.bondPrice();
        expect(usdPrice.toString()).to.eq(assetPriceUsd.mul(1e14).toString());
        expect(bondPrice.toString()).to.eq("100"); // 100 is minimum price
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
            assetPriceUsd.mul(1e5).toString()
        );
    });

    it("Should compute bondPrice", async function () {
        const bondPrice0 = await bond.bondPrice();
        const debtRatio0 = await bond.debtRatio();
        expect(bondPrice0.toString()).to.eq("100");
        let bondAmount = await bond.bondPriceInUSD();
        bondAmount = bondAmount.mul(30);
        await dai.mint(deployer, bondAmount);
        await dai.approve(bond.address, bondAmount);
        await bond.deposit(bondAmount, bondPrice0, deployer);
        const debtRatio1 = await bond.debtRatio();
        const bondPrice1 = await bond.bondPrice();
        expect(debtRatio1.toNumber()).greaterThan(debtRatio0.toNumber());
        expect(bondPrice1.toString()).to.eq(debtRatio1.mul(bcv).div(1e5).toString());
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
        expect(payout.toString()).to.eq(valueOfBond.mul(1e4).div(bondPrice).toString());
    });

    it("Should sell at min price", async function () {
        await bond.setBondTerms(3, 50_0000);
        expect(await bond.bondPrice()).to.eq(50_0000);
        const payout = await bond.payoutFor(10000e9);
        expect(payout).to.eq(200e9);
    });
});
