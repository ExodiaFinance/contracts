import { MockContract, MockContractFactory, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseEther, parseUnits } from "ethers/lib/utils";
import hre from "hardhat";

import { EXODIA_ROLES_DID } from "../../deploy/38_deployExodiaRoles";
import { IExtendedHRE } from "../../packages/HardhatRegistryExtension/ExtendedHRE";
import { IExodiaContractsRegistry } from "../../packages/sdk/contracts/exodiaContracts";
import {
    ExodiaRoles,
    ExodiaRoles__factory,
    MockBaseStrategy,
    MockBaseStrategy__factory,
    MockToken,
    MockToken__factory,
} from "../../packages/sdk/typechain";
import "../chai-setup";
import {
    PAUSABLE_PAUSED,
    ROLES_CALLER_IS_NOT_STRATEGIST,
    STRATEGY_CALLER_IS_NOT_ALLOCATOR,
} from "../errors";
const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;

describe("BaseStrategy", function () {
    let deployer: SignerWithAddress;
    let otherAccount: SignerWithAddress;
    let strat: MockContract<MockBaseStrategy>;
    let roles: ExodiaRoles;
    let token: MockContract<MockToken>;

    // Use a fixture to deploy new contracts to speed up testing time
    const setup = deployments.createFixture(async (hh) => {
        await deployments.fixture([EXODIA_ROLES_DID]);
        const rolesDeploy = await get<ExodiaRoles__factory>("ExodiaRoles");
        roles = rolesDeploy.contract;
        await roles.addStrategist(deployer.address);
        const stratFactory = await smock.mock<MockBaseStrategy__factory>(
            "MockBaseStrategy"
        );
        strat = await stratFactory.deploy();
        await strat.initialize(deployer.address, roles.address);
        const tokenFactory = await smock.mock<MockToken__factory>("MockToken");
        token = await tokenFactory.deploy(18);
    });

    beforeEach(async function () {
        const { deployer: deployerAddress } = await getNamedAccounts();
        const [address0] = await getUnnamedAccounts();
        deployer = await xhre.ethers.getSigner(deployerAddress);
        otherAccount = await xhre.ethers.getSigner(address0);
        await setup();
    });

    it("Should send token to DAO", async function () {
        const mintAmount = parseEther("1");
        await token.mint(strat.address, mintAmount);
        await strat.extractToDAO(token.address);
        expect(await token.balanceOf(await roles.DAO_ADDRESS())).to.eq(mintAmount);
    });

    it("Should pause deploy", async function () {
        await strat.pause();
        await expect(strat.deploy(token.address)).to.be.revertedWith(PAUSABLE_PAUSED);
    });

    it("Should unpause deploy", async function () {
        await strat.pause();
        await strat.unPause();
        await expect(strat.deploy(token.address)).to.not.be.reverted;
    });

    describe("permissions", async function () {
        let stratAsOther: MockContract<MockBaseStrategy>;

        beforeEach(async () => {
            stratAsOther = strat.connect(otherAccount);
        });

        it("Should only let allocator call withdrawTo", async function () {
            await expect(
                stratAsOther.withdrawTo(token.address, 100, otherAccount.address)
            ).to.be.revertedWith(STRATEGY_CALLER_IS_NOT_ALLOCATOR);
        });

        it("Should only let allocator call emergencyWithdrawTo", async function () {
            await expect(
                stratAsOther.emergencyWithdrawTo(token.address, otherAccount.address)
            ).to.be.revertedWith(STRATEGY_CALLER_IS_NOT_ALLOCATOR);
        });

        it("Should only let allocator call collectProfits", async function () {
            await expect(
                stratAsOther.collectProfits(token.address, otherAccount.address)
            ).to.be.revertedWith(STRATEGY_CALLER_IS_NOT_ALLOCATOR);
        });

        it("Should only let allocator call collectRewards", async function () {
            await expect(
                stratAsOther.collectRewards(token.address, otherAccount.address)
            ).to.be.revertedWith(STRATEGY_CALLER_IS_NOT_ALLOCATOR);
        });

        it("Should only let strategist call exit", async function () {
            await expect(stratAsOther.exit(token.address)).to.be.revertedWith(
                ROLES_CALLER_IS_NOT_STRATEGIST
            );
        });

        it("Should only let strategist call extractToDao", async function () {
            await expect(stratAsOther.extractToDAO(token.address)).to.be.revertedWith(
                ROLES_CALLER_IS_NOT_STRATEGIST
            );
        });

        it("Should only let strategist pause the strategy", async function () {
            await expect(stratAsOther.pause()).to.be.revertedWith(
                ROLES_CALLER_IS_NOT_STRATEGIST
            );
        });

        it("Should only let strategist unpause", async function () {
            await strat.pause();
            await expect(stratAsOther.unPause()).to.be.revertedWith(
                ROLES_CALLER_IS_NOT_STRATEGIST
            );
        });
    });
});
