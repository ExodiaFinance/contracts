import { expect } from "chai";
import { BigNumber, ethers } from "ethers";
import hre from "hardhat";

import { DAI_BOND_DID } from "../deploy/11_deployDaiBond";
import { DAI_BOND_SET_STAKING_DID } from "../deploy/12_daiBondSetStaking";
import { ALLOW_DAI_BOND_TREASURY } from "../deploy/13_allowDaiBondsTreasuryAccess";
import { MINT_OHM_DID } from "../deploy/16_mintOHM";
import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import { DAI_DECIMALS, OHM_DECIMALS, toWei } from "../src/utils";
import {
    DAI,
    DAI__factory,
    DAIBondDepository,
    DAIBondDepository__factory,
} from "../typechain";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, deploy, getNamedAccounts } = xhre;
describe("Dai bond depository", function () {
    let daiBond: DAIBondDepository;
    let dai: DAI;
    let deployer: string;
    beforeEach(async function () {
        const accounts = await getNamedAccounts();
        deployer = accounts.deployer;
        await deployments.fixture([
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
        expect(bondPrice.toString()).eq(bondPriceUSD.div(1e9).div(1e7).toString());
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
        const bondPrice = await daiBond.bondPrice();
        const bondPriceUSD = await daiBond.bondPriceInUSD();
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
        await daiBond.setBondTerms(4, 200);
        const payout = await daiBond.payoutFor(10e9);
        expect(payout).to.eq(5e9);
    });
});
