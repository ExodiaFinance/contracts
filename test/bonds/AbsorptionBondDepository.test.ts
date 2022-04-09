import { smock } from "@defi-wonderland/smock";
import { MockContract, MockContractFactory } from "@defi-wonderland/smock/dist/src/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { BigNumber, Signer } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import hre from "hardhat";
import { DAI_DID } from "../../deploy/00_deployDai";

import { OHM_DID } from "../../deploy/01_deployOhm";
import { TREASURY_DID } from "../../deploy/03_deployTreasury";
import { IExodiaContractsRegistry } from "../../packages/sdk/contracts/exodiaContracts";
import { IExtendedHRE } from "../../packages/HardhatRegistryExtension/ExtendedHRE";
import mint from "../../packages/utils/mint";
import {
    AbsorptionBond,
    AbsorptionBond__factory,
    DAI,
    DAI__factory,
    MockToken,
    MockToken__factory,
    OlympusERC20Token,
    OlympusERC20Token__factory,
    OlympusTreasury,
    OlympusTreasury__factory,
} from "../../packages/sdk/typechain";
import { increaseTime, mine } from "../testUtils";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, deploy, getNamedAccounts, getUnnamedAccounts } = xhre;

describe("Absorption bond", function () {
    let ercFactory: MockContractFactory<MockToken__factory>;
    let principle: MockContract<MockToken>;
    let wsexod: MockContract<MockToken>;
    let deployer: SignerWithAddress;
    let holder: SignerWithAddress;
    let bond: AbsorptionBond;
    let dao: string;

    let balance = parseUnits("1000", "ether");
    let totalSupply = parseUnits("10000", "ether");
    const seedAmount = parseUnits("100", "ether");
    const validForDays = 30;
    const vestingTerms = 3;

    beforeEach(async function () {
        await deployments.fixture([OHM_DID, TREASURY_DID, DAI_DID]);
        const { deployer: deployerAddress } = await getNamedAccounts();
        const [holderAddress, DAO] = await getUnnamedAccounts();
        dao = DAO;
        deployer = await xhre.ethers.getSigner(deployerAddress);
        holder = await xhre.ethers.getSigner(holderAddress);
        ercFactory = await smock.mock<MockToken__factory>("MockToken");
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
        bond = AbsorptionBond__factory.connect(deployment.address, deployer);
        await expect(bond.deposit(100, deployer.address)).to.be.revertedWith(
            "Bond is not open yet"
        );
    });

    describe("when seeded", function () {
        const setupSeededBond = deployments.createFixture(async (hh) => {
            const deployment = await deployments.deploy("AbsorptionBond", {
                args: [wsexod.address, principle.address, dao],
                from: deployer.address,
            });
            bond = AbsorptionBond__factory.connect(deployment.address, deployer);
            await wsexod.mint(deployer.address, seedAmount);
            await wsexod.approve(bond.address, seedAmount);
            await bond.seed(seedAmount, vestingTerms, validForDays);
        });

        beforeEach(async function () {
            await setupSeededBond();
        });

        it("Should return the price", async function () {
            expect(await bond.bondPrice()).to.eq(parseUnits("100", "ether"));
        });

        it("Should return payout for principle", async function () {
            expect(await bond.payoutFor(parseUnits("200", "ether"))).to.eq(
                parseUnits("2", "ether")
            );
        });

        it("Should not have vested tokens", async function () {
            expect(await bond.pendingPayoutFor(deployer.address)).to.eq(0);
            expect(await bond.percentVestedFor(deployer.address)).to.eq(0);
        });

        it("Should not return a bond", async function () {
            const bondInfo = await bond.bondInfo(deployer.address);
            expect(bondInfo.payout).to.eq(0);
            expect(bondInfo.vesting).to.eq(0);
            expect(bondInfo.lastBlock).to.eq(0);
            expect(bondInfo.pricePaid).to.eq(0);
        });

        it("Should not give funds if not bonded", async function () {
            await bond.redeem(deployer.address);
            expect(await wsexod.balanceOf(deployer.address)).to.eq(0);
        });

        describe("When bonded", function () {
            let payout: BigNumber;
            beforeEach(async function () {
                payout = await bond.payoutFor(balance);
                await principle.approve(bond.address, balance);
                await bond.deposit(balance, deployer.address);
            });

            it("Should remove principle from bonder", async function () {
                expect(await principle.balanceOf(deployer.address)).to.eq(0);
            });

            it("Should be fully vested", async function () {
                expect(await bond.pendingPayoutFor(deployer.address)).to.eq(0);
                expect(await bond.percentVestedFor(deployer.address)).to.eq(0);
            });

            it("Should return a bond", async function () {
                const bondInfo = await bond.bondInfo(deployer.address);
                expect(bondInfo.payout).to.eq(balance.mul(seedAmount).div(totalSupply));
                expect(bondInfo.vesting).to.eq(vestingTerms);
                expect(bondInfo.lastBlock).to.eq(
                    await xhre.ethers.provider.getBlockNumber()
                );
                expect(bondInfo.pricePaid).to.eq(balance);
            });

            describe("After 1/3 vesting", function () {
                beforeEach(async function () {
                    await increaseTime(xhre, 1, vestingTerms / 3);
                });

                it("Should have 1/3 of vested", async function () {
                    expect(await bond.pendingPayoutFor(deployer.address)).to.closeTo(
                        payout.div(3),
                        1e15
                    );
                    expect(await bond.percentVestedFor(deployer.address)).to.eq(
                        BigNumber.from("10000").div(3)
                    );
                });

                it("Should claim 2/3 of payout (cause it counts the block)", async function () {
                    await bond.redeem(deployer.address);
                    const redeemed = payout.mul(2).div(3);
                    const wsexodBalance = await wsexod.balanceOf(deployer.address);
                    expect(wsexodBalance).to.closeTo(redeemed, 1e15);
                    const bondInfo = await bond.bondInfo(deployer.address);
                    expect(bondInfo.payout).to.eq(payout.sub(wsexodBalance));
                    const blocksLeft = vestingTerms - 2;
                    expect(bondInfo.vesting).to.eq(blocksLeft);
                    expect(bondInfo.lastBlock).to.eq(
                        await xhre.ethers.provider.getBlockNumber()
                    );
                    expect(bondInfo.pricePaid).to.eq(balance);
                });

                it("Should be able to claim many times", async function () {
                    await bond.redeem(deployer.address);
                    const redeemed = payout.mul(2).div(3);
                    const wsexodBalance0 = await wsexod.balanceOf(deployer.address);
                    expect(wsexodBalance0).to.closeTo(redeemed, 1e15);
                    await bond.redeem(deployer.address);
                    const wsexodBalance1 = await wsexod.balanceOf(deployer.address);
                    expect(wsexodBalance1).to.eq(payout);
                });
            });

            describe("After vestingTerms", function () {
                beforeEach(async function () {
                    await mine(xhre);
                    await mine(xhre);
                    await mine(xhre);
                });

                it("Should be fully vested", async function () {
                    expect(await bond.pendingPayoutFor(deployer.address)).to.eq(payout);
                    expect(await bond.percentVestedFor(deployer.address)).to.eq(10000);
                });

                it("Should redeem everything", async function () {
                    await bond.redeem(deployer.address);
                    const redeemed = payout;
                    const wsexodBalance = await wsexod.balanceOf(deployer.address);
                    expect(wsexodBalance).to.closeTo(redeemed, 1e15);
                    const bondInfo = await bond.bondInfo(deployer.address);
                    expect(bondInfo.payout).to.eq(0);
                    expect(bondInfo.vesting).to.eq(0);
                    expect(bondInfo.lastBlock).to.eq(0);
                    expect(bondInfo.pricePaid).to.eq(0);
                });
            });
        });

        describe("Recovering seed tokens", async function () {
            it("Should recover all tokens", async function () {
                await increaseTime(xhre, 86400 * validForDays);
                expect(await wsexod.balanceOf(bond.address)).to.eq(seedAmount);
                await bond.recoverUnclaimed();
                expect(await wsexod.balanceOf(dao)).to.eq(seedAmount);
            });

            it("Should recover unbonded tokens", async function () {
                const payout = await bond.payoutFor(balance);
                await principle.approve(bond.address, balance);
                await bond.deposit(balance, deployer.address);
                await increaseTime(xhre, 86400 * validForDays);
                await bond.recoverUnclaimed();
                expect(await wsexod.balanceOf(dao)).to.eq(seedAmount.sub(payout));
            });

            it("Should not let user bonds", async function () {
                await increaseTime(xhre, 86400 * validForDays);
                await expect(bond.deposit(balance, deployer.address)).to.be.revertedWith(
                    "Bonding period is done"
                );
            });

            it("Should not let recover token before time is up", async function () {
                await expect(bond.recoverUnclaimed()).to.be.revertedWith(
                    "bonding period is not done"
                );
            });
        });
    });

    describe("5 decimals principle", function () {
        beforeEach(async function () {
            principle = await ercFactory.deploy(5);
            balance = BigNumber.from(30e5);
            totalSupply = BigNumber.from(100e5);

            await principle.mint(holder.address, totalSupply.sub(balance));
            await principle.mint(deployer.address, balance);
            const deployment = await deployments.deploy("AbsorptionBond", {
                args: [wsexod.address, principle.address, dao],
                from: deployer.address,
            });
            bond = AbsorptionBond__factory.connect(deployment.address, deployer);
            await wsexod.mint(deployer.address, seedAmount);
            await wsexod.approve(bond.address, seedAmount);
            await bond.seed(seedAmount, vestingTerms, validForDays);
        });

        it("Should return the price", async function () {
            expect(await bond.bondPrice()).to.eq(1e5);
        });

        it("Should return payout for principle", async function () {
            expect(await bond.payoutFor(2e5)).to.eq(BigNumber.from(2e9).mul(1e9));
        });
    });
});
