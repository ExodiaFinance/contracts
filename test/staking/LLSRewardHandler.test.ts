import { expect } from "chai";
import { BigNumber, ethers } from "ethers";
import hre from "hardhat";

import { MINT_OHM_DID } from "../../deploy/16_mintOHM";
import { LIQUID_LOCK_STAKING_DID } from "../../deploy/24_liquidLockStakingDeployment";
import { IExodiaContractsRegistry } from "../../packages/sdk/contracts/exodiaContracts";
import { IExtendedHRE } from "../../packages/HardhatRegistryExtension/ExtendedHRE";
import mint from "../../packages/utils/mint";
import { DAI_DECIMALS, OHM_DECIMALS, toWei } from "../../packages/utils/utils";
import {
    DAI,
    DAI__factory,
    LiquidLockStaking,
    LiquidLockStaking__factory,
    LLSRewardHandler,
    LLSRewardHandler__factory,
    OlympusERC20Token,
    OlympusERC20Token__factory,
    OlympusTreasury,
    OlympusTreasury__factory,
    WOHM,
    WOHM__factory,
} from "../../packages/sdk/typechain";
import "../chai-setup";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, deploy, getNamedAccounts } = xhre;

const parseUnits = ethers.utils.parseUnits;

describe("LLSRewardHandler", function () {
    let deployer: string;
    let wsexod: WOHM;
    let exod: OlympusERC20Token;
    let liquidLockStaking: LiquidLockStaking;
    let rewardHandler: LLSRewardHandler;
    let dai: DAI;
    let treasury: OlympusTreasury;
    beforeEach(async function () {
        const accounts = await getNamedAccounts();
        deployer = accounts.deployer;
        await deployments.fixture([LIQUID_LOCK_STAKING_DID, MINT_OHM_DID]);
        const treasuryDeployment = await get<OlympusTreasury__factory>("OlympusTreasury");
        treasury = treasuryDeployment.contract;
        const wohmDeployment = await get<WOHM__factory>("wOHM");
        wsexod = wohmDeployment.contract;
        const daiDeployment = await get<DAI__factory>("DAI");
        dai = daiDeployment.contract;
        const ohmDeployment = await get<OlympusERC20Token__factory>("OlympusERC20Token");
        exod = ohmDeployment.contract;
        const llsDeployment = await get<LiquidLockStaking__factory>("LiquidLockStaking");

        liquidLockStaking = llsDeployment.contract;
        const rewardHandlerDeployment = await get<LLSRewardHandler__factory>(
            "LLSRewardHandler"
        );
        rewardHandler = rewardHandlerDeployment.contract;

        // Mint wsEXOD
        await mint(deployer, treasury, dai, toWei(100, DAI_DECIMALS));
        await exod.approve(wsexod.address, toWei(100, OHM_DECIMALS));
        await wsexod.wrapFromOHM(toWei(100, OHM_DECIMALS));
    });

    it("UpdateShares should reject if not called by staking contract", async function () {
        expect(rewardHandler.updateShares(0, 100)).to.be.rejectedWith("E060");
    });

    it("ClaimRewards should reject if not called by staking contract", async function () {
        expect(rewardHandler.claimRewards(0, deployer)).to.be.rejectedWith("E060");
    });

    it("Should update shares", async function () {
        await rewardHandler.setStakingContract(deployer);
        const shares = parseUnits("2", "ether");
        await rewardHandler.updateShares(1, shares);
        const nftBalance = await rewardHandler.getBalance(1);
        expect(nftBalance.allocPoint).to.eq(shares);
        const multiplier = await rewardHandler.getMul();
        expect(nftBalance.lastMul).to.eq(multiplier);
    });

    it("Should increment total allocation", async function () {
        await rewardHandler.setStakingContract(deployer);
        const allocation0 = await rewardHandler.totalAllocPoint();
        const shares = parseUnits("1", "ether");
        await rewardHandler.updateShares(0, shares);
        await rewardHandler.updateShares(1, shares);
        const allocation1 = await rewardHandler.totalAllocPoint();
        expect(allocation1).to.equal(shares.mul(2).add(allocation0));
    });

    it("Should increase totalAlloc by delta alloc", async function () {
        await rewardHandler.setStakingContract(deployer);
        const allocation0 = await rewardHandler.totalAllocPoint();
        const shares = parseUnits("1", "ether");
        await rewardHandler.updateShares(0, shares);
        await rewardHandler.updateShares(0, shares.mul(2));
        const allocation1 = await rewardHandler.totalAllocPoint();
        expect(allocation1).to.equal(shares.mul(2).add(allocation0));
    });

    it("Should decrease totalAlloc by delta alloc", async function () {
        await rewardHandler.setStakingContract(deployer);
        const allocation0 = await rewardHandler.totalAllocPoint();
        const shares = parseUnits("1", "ether");
        await rewardHandler.updateShares(0, shares.mul(10));
        await rewardHandler.updateShares(0, shares.mul(2));
        const allocation1 = await rewardHandler.totalAllocPoint();
        expect(allocation1).to.equal(shares.mul(2).add(allocation0));
    });

    it("Should deposit reward tokens and increase multiplier", async function () {
        const deployerBal0 = await wsexod.balanceOf(deployer);
        await wsexod.approve(rewardHandler.address, deployerBal0);
        const multiplier0 = await rewardHandler.getMul();
        await rewardHandler.depositReward(deployerBal0);
        const rhBal0 = await wsexod.balanceOf(rewardHandler.address);
        expect(rhBal0).to.equal(deployerBal0);
        const multiplier1 = await rewardHandler.getMul();
        const totalAllocation = await rewardHandler.totalAllocPoint();
        expect(multiplier1).to.be.gt(multiplier0);
        expect(multiplier1).to.eq(
            multiplier0.add(deployerBal0.mul(1e9).mul(1e9).mul(1e9))
        );
    });

    it("Should claim rewards (2 claims)", async function () {
        await rewardHandler.setStakingContract(deployer);
        const balance0 = await rewardHandler.getBalance(0);
        expect(balance0.lastMul).to.eq(0);
        expect(balance0.allocPoint).to.eq(0);
        const oneShare = parseUnits("1", "ether");
        await rewardHandler.updateShares(0, oneShare);
        const deployerBal0 = await wsexod.balanceOf(deployer);
        await wsexod.approve(rewardHandler.address, deployerBal0);
        await rewardHandler.depositReward(deployerBal0);
        await rewardHandler.claimRewards(0, deployer);
        const deployerBal1 = await wsexod.balanceOf(deployer);
        const balance1 = await rewardHandler.getBalance(0);
        const multiplier0 = await rewardHandler.getMul();
        expect(balance1.lastMul).to.eq(multiplier0);
        expect(deployerBal1).to.be.closeTo(deployerBal0, 1000);
        await wsexod.approve(rewardHandler.address, deployerBal1);
        await rewardHandler.depositReward(deployerBal1);
        await rewardHandler.claimRewards(0, deployer);
        const deployerBal2 = await wsexod.balanceOf(deployer);
        const balance2 = await rewardHandler.getBalance(0);
        const multiplier1 = await rewardHandler.getMul();
        expect(balance2.lastMul).to.eq(multiplier1);
        expect(deployerBal2).to.be.closeTo(deployerBal0, 1000);
    });

    it("Should claim rewards (2 stakers)", async function () {
        await rewardHandler.setStakingContract(deployer);
        const balance0 = await rewardHandler.getBalance(0);
        expect(balance0.lastMul).to.eq(0);
        expect(balance0.allocPoint).to.eq(0);
        const oneShare = parseUnits("1", "ether");
        await rewardHandler.updateShares(0, oneShare);
        await rewardHandler.updateShares(1, oneShare.mul(2));
        const deployerBal0 = await wsexod.balanceOf(deployer);
        await wsexod.approve(rewardHandler.address, deployerBal0);
        await rewardHandler.depositReward(deployerBal0);
        await rewardHandler.claimRewards(0, deployer);
        const deployerBal1 = await wsexod.balanceOf(deployer);
        const balance1 = await rewardHandler.getBalance(0);
        const multiplier0 = await rewardHandler.getMul();
        expect(balance1.lastMul).to.eq(multiplier0);
        expect(deployerBal1).to.be.closeTo(deployerBal0.div(3), 1000);
    });

    it("Should claim rewards (2 claims, 2 stakers)", async function () {
        const [claimer0, claimer1] = await hre.getUnnamedAccounts();
        await rewardHandler.setStakingContract(deployer);
        const oneShare = parseUnits("1", "ether");
        await rewardHandler.updateShares(0, oneShare);
        await rewardHandler.updateShares(1, oneShare.mul(3));
        const deployerBal0 = await wsexod.balanceOf(deployer);
        await wsexod.approve(rewardHandler.address, deployerBal0);
        await rewardHandler.depositReward(deployerBal0.div(2));
        await rewardHandler.claimRewards(0, claimer0);
        const claimer0bal0 = await wsexod.balanceOf(claimer0);
        const balance1 = await rewardHandler.getBalance(0);
        const multiplier0 = await rewardHandler.getMul();
        expect(balance1.lastMul).to.eq(multiplier0);
        expect(claimer0bal0).to.be.closeTo(deployerBal0.div(8), 1000);
        await rewardHandler.depositReward(deployerBal0.div(2));
        await rewardHandler.claimRewards(0, claimer0);
        const claimer0bal1 = await wsexod.balanceOf(claimer0);
        const balance2 = await rewardHandler.getBalance(0);
        const multiplier1 = await rewardHandler.getMul();
        expect(balance2.lastMul).to.eq(multiplier1);
        expect(claimer0bal1).to.be.closeTo(deployerBal0.div(4), 1000);
        await rewardHandler.claimRewards(1, claimer1);
        const claimer1bal0 = await wsexod.balanceOf(claimer1);
        const claimer1StakeBal0 = await rewardHandler.getBalance(1);
        expect(claimer1StakeBal0.lastMul).to.eq(multiplier1);
        expect(claimer1bal0).to.be.closeTo(deployerBal0.mul(3).div(4), 1000);
    });

    it("Should claim rewards with reduced shares", async function () {
        const [claimer0] = await hre.getUnnamedAccounts();
        await rewardHandler.setStakingContract(deployer);
        const oneShare = parseUnits("1", "ether");
        await rewardHandler.updateShares(0, oneShare);
        await rewardHandler.updateShares(1, oneShare.mul(3));
        const deployerBal0 = await wsexod.balanceOf(deployer);
        await wsexod.approve(rewardHandler.address, deployerBal0);
        await rewardHandler.depositReward(deployerBal0.div(2));
        await rewardHandler.claimRewards(0, claimer0);
        const claimer0bal0 = await wsexod.balanceOf(claimer0);
        const balance1 = await rewardHandler.getBalance(0);
        const multiplier0 = await rewardHandler.getMul();
        expect(balance1.lastMul).to.eq(multiplier0);
        expect(claimer0bal0).to.be.closeTo(deployerBal0.div(8), 1000);
        await rewardHandler.updateShares(1, oneShare);
        await rewardHandler.depositReward(deployerBal0.div(2));
        await rewardHandler.claimRewards(0, claimer0);
        const claimer0bal1 = await wsexod.balanceOf(claimer0);
        const balance2 = await rewardHandler.getBalance(0);
        const multiplier1 = await rewardHandler.getMul();
        expect(balance2.lastMul).to.eq(multiplier1);
        expect(claimer0bal1).to.be.closeTo(
            deployerBal0.div(8).add(deployerBal0.div(4)),
            1000
        );
    });
});
