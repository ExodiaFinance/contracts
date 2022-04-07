"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const smock_1 = require("@defi-wonderland/smock");
const chai_1 = require("chai");
const ethers_1 = require("ethers");
const utils_1 = require("ethers/lib/utils");
const hardhat_1 = __importDefault(require("hardhat"));
const _00_deployDai_1 = require("../../deploy/00_deployDai");
const _01_deployOhm_1 = require("../../deploy/01_deployOhm");
const _03_deployTreasury_1 = require("../../deploy/03_deployTreasury");
const typechain_1 = require("../../packages/sdk/typechain");
const testUtils_1 = require("../testUtils");
const xhre = hardhat_1.default;
const { deployments, get, deploy, getNamedAccounts, getUnnamedAccounts } = xhre;
describe("Absorption bond", function () {
    let ercFactory;
    let principle;
    let wsexod;
    let deployer;
    let holder;
    let bond;
    let dao;
    let balance = (0, utils_1.parseUnits)("1000", "ether");
    let totalSupply = (0, utils_1.parseUnits)("10000", "ether");
    const seedAmount = (0, utils_1.parseUnits)("100", "ether");
    const validForDays = 30;
    const vestingTerms = 3;
    beforeEach(async function () {
        await deployments.fixture([
            _01_deployOhm_1.OHM_DID,
            _03_deployTreasury_1.TREASURY_DID,
            _00_deployDai_1.DAI_DID,
        ]);
        const { deployer: deployerAddress } = await getNamedAccounts();
        const [holderAddress, DAO] = await getUnnamedAccounts();
        dao = DAO;
        deployer = await xhre.ethers.getSigner(deployerAddress);
        holder = await xhre.ethers.getSigner(holderAddress);
        ercFactory = await smock_1.smock.mock("MockToken");
        principle = await ercFactory.deploy(18);
        wsexod = await ercFactory.deploy(18);
        await principle.mint(holder.address, totalSupply.sub(balance));
        await principle.mint(deployer.address, balance);
    });
    it("Should not let user bond before seeding", async function () {
        const deployment = await deployments.deploy("AbsorptionBond", {
            args: [wsexod.address, principle.address, dao],
            from: deployer.address,
        });
        bond = typechain_1.AbsorptionBond__factory.connect(deployment.address, deployer);
        (0, chai_1.expect)(bond.deposit(100, deployer.address)).to.be.revertedWith(
            "Bond is not open yet"
        );
    });
    describe("when seeded", function () {
        const setupSeededBond = deployments.createFixture(async (hh) => {
            const deployment = await deployments.deploy("AbsorptionBond", {
                args: [wsexod.address, principle.address, dao],
                from: deployer.address,
            });
            bond = typechain_1.AbsorptionBond__factory.connect(
                deployment.address,
                deployer
            );
            await wsexod.mint(deployer.address, seedAmount);
            await wsexod.approve(bond.address, seedAmount);
            await bond.seed(seedAmount, vestingTerms, validForDays);
        });
        beforeEach(async function () {
            await setupSeededBond();
        });
        it("Should return the price", async function () {
            (0, chai_1.expect)(await bond.bondPrice()).to.eq(
                (0, utils_1.parseUnits)("100", "ether")
            );
        });
        it("Should return payout for principle", async function () {
            (0, chai_1.expect)(
                await bond.payoutFor((0, utils_1.parseUnits)("200", "ether"))
            ).to.eq((0, utils_1.parseUnits)("2", "ether"));
        });
        it("Should not have vested tokens", async function () {
            (0, chai_1.expect)(await bond.pendingPayoutFor(deployer.address)).to.eq(0);
            (0, chai_1.expect)(await bond.percentVestedFor(deployer.address)).to.eq(0);
        });
        it("Should not return a bond", async function () {
            const bondInfo = await bond.bondInfo(deployer.address);
            (0, chai_1.expect)(bondInfo.payout).to.eq(0);
            (0, chai_1.expect)(bondInfo.vesting).to.eq(0);
            (0, chai_1.expect)(bondInfo.lastBlock).to.eq(0);
            (0, chai_1.expect)(bondInfo.pricePaid).to.eq(0);
        });
        it("Should not give funds if not bonded", async function () {
            await bond.redeem(deployer.address);
            (0, chai_1.expect)(await wsexod.balanceOf(deployer.address)).to.eq(0);
        });
        describe("When bonded", function () {
            let payout;
            beforeEach(async function () {
                payout = await bond.payoutFor(balance);
                await principle.approve(bond.address, balance);
                await bond.deposit(balance, deployer.address);
            });
            it("Should remove principle from bonder", async function () {
                (0, chai_1.expect)(await principle.balanceOf(deployer.address)).to.eq(0);
            });
            it("Should be fully vested", async function () {
                (0, chai_1.expect)(await bond.pendingPayoutFor(deployer.address)).to.eq(
                    0
                );
                (0, chai_1.expect)(await bond.percentVestedFor(deployer.address)).to.eq(
                    0
                );
            });
            it("Should return a bond", async function () {
                const bondInfo = await bond.bondInfo(deployer.address);
                (0, chai_1.expect)(bondInfo.payout).to.eq(
                    balance.mul(seedAmount).div(totalSupply)
                );
                (0, chai_1.expect)(bondInfo.vesting).to.eq(vestingTerms);
                (0, chai_1.expect)(bondInfo.lastBlock).to.eq(
                    await xhre.ethers.provider.getBlockNumber()
                );
                (0, chai_1.expect)(bondInfo.pricePaid).to.eq(balance);
            });
            describe("After 1/3 vesting", function () {
                beforeEach(async function () {
                    await (0, testUtils_1.increaseTime)(xhre, 1, vestingTerms / 3);
                });
                it("Should have 1/3 of vested", async function () {
                    (0, chai_1.expect)(
                        await bond.pendingPayoutFor(deployer.address)
                    ).to.closeTo(payout.div(3), 1e15);
                    (0, chai_1.expect)(
                        await bond.percentVestedFor(deployer.address)
                    ).to.eq(ethers_1.BigNumber.from("10000").div(3));
                });
                it("Should claim 2/3 of payout (cause it counts the block)", async function () {
                    await bond.redeem(deployer.address);
                    const redeemed = payout.mul(2).div(3);
                    const wsexodBalance = await wsexod.balanceOf(deployer.address);
                    (0, chai_1.expect)(wsexodBalance).to.closeTo(redeemed, 1e15);
                    const bondInfo = await bond.bondInfo(deployer.address);
                    (0, chai_1.expect)(bondInfo.payout).to.eq(payout.sub(wsexodBalance));
                    const blocksLeft = vestingTerms - 2;
                    (0, chai_1.expect)(bondInfo.vesting).to.eq(blocksLeft);
                    (0, chai_1.expect)(bondInfo.lastBlock).to.eq(
                        await xhre.ethers.provider.getBlockNumber()
                    );
                    (0, chai_1.expect)(bondInfo.pricePaid).to.eq(balance);
                });
                it("Should be able to claim many times", async function () {
                    await bond.redeem(deployer.address);
                    const redeemed = payout.mul(2).div(3);
                    const wsexodBalance0 = await wsexod.balanceOf(deployer.address);
                    (0, chai_1.expect)(wsexodBalance0).to.closeTo(redeemed, 1e15);
                    await bond.redeem(deployer.address);
                    const wsexodBalance1 = await wsexod.balanceOf(deployer.address);
                    (0, chai_1.expect)(wsexodBalance1).to.eq(payout);
                });
            });
            describe("After vestingTerms", function () {
                beforeEach(async function () {
                    await (0, testUtils_1.mine)(xhre);
                    await (0, testUtils_1.mine)(xhre);
                    await (0, testUtils_1.mine)(xhre);
                });
                it("Should be fully vested", async function () {
                    (0, chai_1.expect)(
                        await bond.pendingPayoutFor(deployer.address)
                    ).to.eq(payout);
                    (0, chai_1.expect)(
                        await bond.percentVestedFor(deployer.address)
                    ).to.eq(10000);
                });
                it("Should redeem everything", async function () {
                    await bond.redeem(deployer.address);
                    const redeemed = payout;
                    const wsexodBalance = await wsexod.balanceOf(deployer.address);
                    (0, chai_1.expect)(wsexodBalance).to.closeTo(redeemed, 1e15);
                    const bondInfo = await bond.bondInfo(deployer.address);
                    (0, chai_1.expect)(bondInfo.payout).to.eq(0);
                    (0, chai_1.expect)(bondInfo.vesting).to.eq(0);
                    (0, chai_1.expect)(bondInfo.lastBlock).to.eq(0);
                    (0, chai_1.expect)(bondInfo.pricePaid).to.eq(0);
                });
            });
        });
        describe("Recovering seed tokens", async function () {
            it("Should recover all tokens", async function () {
                await (0, testUtils_1.increaseTime)(xhre, 86400 * validForDays);
                (0, chai_1.expect)(await wsexod.balanceOf(bond.address)).to.eq(
                    seedAmount
                );
                await bond.recoverUnclaimed();
                (0, chai_1.expect)(await wsexod.balanceOf(dao)).to.eq(seedAmount);
            });
            it("Should recover unbonded tokens", async function () {
                const payout = await bond.payoutFor(balance);
                await principle.approve(bond.address, balance);
                await bond.deposit(balance, deployer.address);
                await (0, testUtils_1.increaseTime)(xhre, 86400 * validForDays);
                await bond.recoverUnclaimed();
                (0, chai_1.expect)(await wsexod.balanceOf(dao)).to.eq(
                    seedAmount.sub(payout)
                );
            });
            it("Should not let user bonds", async function () {
                await (0, testUtils_1.increaseTime)(xhre, 86400 * validForDays);
                (0, chai_1.expect)(
                    bond.deposit(balance, deployer.address)
                ).to.be.revertedWith("Bonding period is done");
            });
            it("Should not let recover token before time is up", async function () {
                (0, chai_1.expect)(bond.recoverUnclaimed()).to.be.revertedWith(
                    "bonding period is not done"
                );
            });
        });
    });
    describe("5 decimals principle", function () {
        beforeEach(async function () {
            principle = await ercFactory.deploy(5);
            balance = ethers_1.BigNumber.from(30e5);
            totalSupply = ethers_1.BigNumber.from(100e5);
            await principle.mint(holder.address, totalSupply.sub(balance));
            await principle.mint(deployer.address, balance);
            const deployment = await deployments.deploy("AbsorptionBond", {
                args: [wsexod.address, principle.address, dao],
                from: deployer.address,
            });
            bond = typechain_1.AbsorptionBond__factory.connect(
                deployment.address,
                deployer
            );
            await wsexod.mint(deployer.address, seedAmount);
            await wsexod.approve(bond.address, seedAmount);
            await bond.seed(seedAmount, vestingTerms, validForDays);
        });
        it("Should return the price", async function () {
            (0, chai_1.expect)(await bond.bondPrice()).to.eq(1e5);
        });
        it("Should return payout for principle", async function () {
            (0, chai_1.expect)(await bond.payoutFor(2e5)).to.eq(
                ethers_1.BigNumber.from(2e9).mul(1e9)
            );
        });
    });
});
