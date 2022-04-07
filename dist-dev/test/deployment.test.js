"use strict";
/*
import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { ethers } from "hardhat";

import deployBasics, { zeroAddress } from "../src/subdeploy/deployBasics";
import deployDai from "../src/subdeploy/deployDai";
import deployStableBond from "../src/subdeploy/deployStableBond";
import mint from "../src/subdeploy/mint";
import toggleRights, { MANAGING } from "../src/subdeploy/toggleRights";
import { DAI_DECIMALS, OHM_DECIMALS, toBN, toWei } from "../src/utils";

describe("test deployments", function () {
    it("should deploy basic ohm, sohm, treasury, staking, staking helper", async function () {
        this.timeout(100000);
        const [deployer] = await ethers.getSigners();
        const dai = await deployDai(ethers, 0);
        const components = await deployBasics(ethers, dai.address);
        expect(components.ohm.address).to.not.be.undefined;
        expect(await components.ohm.owner()).to.be.equal(deployer.address);
        expect(components.sohm.address).to.not.be.undefined;
        expect(await components.sohm.manager()).to.be.equal(deployer.address);
        expect(components.treasury.address).to.not.be.undefined;
        expect(await components.treasury.manager()).to.be.equal(deployer.address);
        expect(components.staking.address).to.not.be.undefined;
        expect(await components.staking.manager()).to.be.equal(deployer.address);
        expect(components.stakingHelper.address).to.not.be.undefined;
        expect(components.distributor.address).to.not.be.undefined;
        expect(await components.distributor.policy()).to.be.equal(deployer.address);
        expect(components.bondCalculator.address).to.not.be.undefined;
        expect(await components.treasury.isReserveDepositor(deployer.address)).to.be.true;
        expect(await components.treasury.isReserveToken(dai.address)).to.be.true;
    });

    it("should mint 1 DAI, deposit and receive 1 OHM", async function () {
        const [deployer] = await ethers.getSigners();
        const dai = await deployDai(ethers, 0);
        const { treasury, ohm } = await deployBasics(ethers, dai.address);
        await mint(ethers, treasury, dai, toWei(1, DAI_DECIMALS));
        const ohmBalance = await ohm.balanceOf(deployer.address);
        expect(ohmBalance.toString()).to.eq(toWei(1, OHM_DECIMALS));
    });

    it("should deploy a bond, test redeem and autostake", async function () {
        const [deployer, DAO] = await ethers.getSigners();
        const dai = await deployDai(ethers, 0);
        const { ohm, treasury, stakingHelper, sohm } = await deployBasics(
            ethers,
            dai.address
        );
        await mint(ethers, treasury, dai, toWei(100, DAI_DECIMALS));
        const bond = await deployStableBond(
            ethers,
            ohm.address,
            dai.address,
            treasury.address,
            DAO.address,
            stakingHelper.address
        );
        const bondBCV = "369";
        const bondVestingLength = "100";
        const minBondPrice = "00000";
        const maxBondPayout = "1000000";
        const bondFee = "0";
        const maxBondDebt = toWei(100, DAI_DECIMALS);
        const initialBondDebt = "0";
        await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, bond.address);
        await bond.initializeBondTerms(
            bondBCV,
            bondVestingLength,
            minBondPrice,
            maxBondPayout,
            bondFee,
            maxBondDebt,
            initialBondDebt
        );

        const amount = toWei(300, DAI_DECIMALS);
        await dai.mint(deployer.address, amount);
        await dai.approve(bond.address, amount);
        // Bond price when init should be 1$ == 100 cents
        const bondPrice0 = await bond.bondPrice();
        expect(bondPrice0.toString()).eq("100");
        const payout0 = await bond.deposit(
            toWei(100, DAI_DECIMALS),
            "100",
            deployer.address
        );
        const totalDebt0 = await bond.totalDebt();
        expect(totalDebt0.toString()).to.be.eq(toWei(100, OHM_DECIMALS));
        const balanceOfBond0 = await ohm.balanceOf(bond.address);
        expect(balanceOfBond0.toString()).to.eq(toWei(100, OHM_DECIMALS));

        await bond.redeem(deployer.address, false);

        const bondPrice1 = await bond.bondPrice();
        expect(bondPrice1.toString()).eq("18365");
        const payout1 = await bond.deposit(
            toWei(100, DAI_DECIMALS),
            "18365",
            deployer.address
        );
        const totalDebt1 = await bond.totalDebt();
        expect(totalDebt1.toString()).to.be.eq(toWei(198, OHM_DECIMALS));
        const balanceOfBond1 = await ohm.balanceOf(bond.address);
        const quantity = toBN(100, 11).div(bondPrice1);
        const expectedBalance = toBN(99, OHM_DECIMALS).add(quantity);
        // Compare 3 first digit, cause rounding errors
        expect(balanceOfBond1.div(1e8).toString()).to.eq(
            expectedBalance.div(1e8).toString()
        );
        await bond.redeem(deployer.address, true);
        const sohmBalance = await sohm.balanceOf(deployer.address);
        expect(sohmBalance.toNumber()).to.be.gt(0);
    });

    it("Should deploy 2 bonds and redeemAll with autostake", async function () {
        const [deployer, DAO] = await ethers.getSigners();
        const dai = await deployDai(ethers, 0);
        const { ohm, treasury, stakingHelper, sohm, redeemHelper } = await deployBasics(
            ethers,
            dai.address
        );
        await mint(ethers, treasury, dai, toWei(100, DAI_DECIMALS));
        const bond0 = await deployStableBond(
            ethers,
            ohm.address,
            dai.address,
            treasury.address,
            DAO.address,
            stakingHelper.address,
            redeemHelper.address
        );
        const bondBCV = "369";
        const bondVestingLength = "1";
        const minBondPrice = "00000";
        const maxBondPayout = "1000000";
        const bondFee = "0";
        const maxBondDebt = toWei(100, DAI_DECIMALS);
        const initialBondDebt = "0";
        await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, bond0.address);
        await bond0.initializeBondTerms(
            bondBCV,
            bondVestingLength,
            minBondPrice,
            maxBondPayout,
            bondFee,
            maxBondDebt,
            initialBondDebt
        );
        const bond1 = await deployStableBond(
            ethers,
            ohm.address,
            dai.address,
            treasury.address,
            DAO.address,
            stakingHelper.address,
            redeemHelper.address
        );
        await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, bond1.address);
        await bond1.initializeBondTerms(
            bondBCV,
            bondVestingLength,
            minBondPrice,
            maxBondPayout,
            bondFee,
            maxBondDebt,
            initialBondDebt
        );
        const amount = toWei(500, DAI_DECIMALS);
        await dai.mint(deployer.address, amount);
        await dai.approve(bond0.address, amount);
        await dai.approve(bond1.address, amount);
        await bond0.deposit(toWei(100, DAI_DECIMALS), "100", deployer.address);
        await bond1.deposit(toWei(100, DAI_DECIMALS), "100", deployer.address);
        await ethers.provider.send("evm_mine", []);
        await redeemHelper.redeemAll(deployer.address, false);
        const ohmBalance = await ohm.balanceOf(deployer.address);
        expect(ohmBalance.toString()).to.eq(toWei(300, OHM_DECIMALS)); // 100 minted + 2x 100 bonds
        await bond0.deposit(toWei(100, DAI_DECIMALS), "100", deployer.address);
        await bond1.deposit(toWei(100, DAI_DECIMALS), "100", deployer.address);
        await ethers.provider.send("evm_mine", []);
        await redeemHelper.redeemAll(deployer.address, true);
        const sohmBalance = await sohm.balanceOf(deployer.address);
        expect(sohmBalance.toString()).to.eq(toWei(200, OHM_DECIMALS)); // 2x 100 bonds
    });
});
*/
