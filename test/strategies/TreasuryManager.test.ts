import { MockContract, smock } from "@defi-wonderland/smock";
import { MockContractFactory } from "@defi-wonderland/smock/dist/src/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import hre from "hardhat";
import { TREASURY_MANAGER_DID } from "../../deploy/39_deployTreasuryManager";
import { IExodiaContractsRegistry } from "../../src/contracts/exodiaContracts";
import { IExtendedHRE } from "../../src/HardhatRegistryExtension/ExtendedHRE";
import toggleRights, { MANAGING } from "../../src/subdeploy/toggleRights";
import {
    AllocatedRiskFreeValue,
    AllocatedRiskFreeValue__factory,
    DAI,
    DAI__factory,
    MockToken,
    MockToken__factory,
    OlympusTreasury,
    OlympusTreasury__factory,
    TreasuryManager,
    TreasuryManager__factory,
} from "../../typechain";
import "../chai-setup";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;

describe("AssetManager", function () {
    let deployer: SignerWithAddress;
    let otherAccount: SignerWithAddress;

    let dai: DAI;
    let treasury: OlympusTreasury;
    let treasuryManager: TreasuryManager;
    let arfv: AllocatedRiskFreeValue;
    let machine: MockContract<TreasuryManager>;

    // Use a fixture to deploy new contracts to speed up testing time
    const setup = deployments.createFixture(async (hh) => {
        await deployments.fixture([TREASURY_MANAGER_DID]);
        const managerDeployment = await get<TreasuryManager__factory>("TreasuryManager");
        treasuryManager = managerDeployment.contract;
        const machineFactory = await smock.mock("TreasuryManagerMockMachine");
        machine = (await machineFactory.deploy(
            treasuryManager.address
        )) as unknown as MockContract<TreasuryManager>;
        await treasuryManager.addMachine(machine.address);
    });

    beforeEach(async function () {
        const { deployer: deployerAddress } = await getNamedAccounts();
        const [address0] = await getUnnamedAccounts();
        deployer = await xhre.ethers.getSigner(deployerAddress);
        otherAccount = await xhre.ethers.getSigner(address0);
        await setup();
        const daiDeployment = await get<DAI__factory>("DAI");
        dai = daiDeployment.contract;
        const treasuryDeployment = await get<OlympusTreasury__factory>("OlympusTreasury");
        treasury = treasuryDeployment.contract;
        const arfvDeployment = await get<AllocatedRiskFreeValue__factory>(
            "AllocatedRiskFreeValue"
        );
        arfv = arfvDeployment.contract;
    });

    it("Should only let machine use manage", async function () {
        expect(treasuryManager.manage(dai.address, 1000)).to.be.revertedWith(
            "caller is not a machine"
        );
    });

    it("Should only let machine use withdraw", async function () {
        expect(treasuryManager.withdraw(dai.address, 1000)).to.be.revertedWith(
            "caller is not a machine"
        );
    });

    it("Should not let address call manage", async function () {
        await treasuryManager.addMachine(deployer.address);
        expect(treasuryManager.manage(dai.address, 1000)).to.be.revertedWith(
            "caller is not a contract"
        );
    });

    it("Should not let address call withdraw", async function () {
        await treasuryManager.addMachine(deployer.address);
        expect(treasuryManager.withdraw(dai.address, 1000)).to.be.revertedWith(
            "caller is not a contract"
        );
    });

    describe("RFV", async function () {
        const daiBalance = parseUnits("10000", "ether");
        const setupDAIManagingTest = deployments.createFixture(async (xhh) => {
            await dai.mint(deployer.address, daiBalance);
            await dai.approve(treasury.address, daiBalance);
            await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, deployer.address);
            await treasury.deposit(daiBalance, dai.address, daiBalance.div(1e9));
        });

        beforeEach(async () => {
            await setupDAIManagingTest();
        });

        const testsManage = () => {
            it("Should withdraw 100% to mock and replace with ARFV in treasury", async function () {
                await manageExpectation(daiBalance);
            });

            it("Should withdraw 50% to mock and replace with ARFV in treasury", async function () {
                const amount = daiBalance.div(2);
                await manageExpectation(amount);
            });
        };

        const manageExpectation = async (amount: BigNumber) => {
            const totalReserve = await treasury.totalReserves();
            await machine.manage(dai.address, amount);
            expect(await dai.balanceOf(machine.address)).to.eq(amount);
            expect(await arfv.balanceOf(treasury.address)).to.eq(amount.div(1e9));
            expect(await treasury.totalReserves()).to.eq(totalReserve);
        };

        describe("with 100% excess reserve", function () {
            testsManage();

            it("Can withdraw all balance", async function () {
                await machine.withdraw(dai.address, daiBalance);
                expect(await dai.balanceOf(machine.address)).to.eq(daiBalance);
                expect(await arfv.balanceOf(treasury.address)).to.eq(0);
                expect(await treasury.totalReserves()).to.eq(0);
            });
        });

        describe("with 50% excess reserve", function () {
            const setup50ExcessReserve = deployments.createFixture(async (hh) => {
                await toggleRights(treasury, MANAGING.REWARDMANAGER, deployer.address);
                await treasury.mintRewards(deployer.address, daiBalance.div(2).div(1e9));
            });

            beforeEach(async function () {
                await setup50ExcessReserve();
            });

            testsManage();

            it("Can withdraw half balance", async function () {
                const amount = daiBalance.div(2);
                await machine.withdraw(dai.address, amount);
                expect(await dai.balanceOf(machine.address)).to.eq(amount);
                expect(await dai.balanceOf(treasury.address)).to.eq(amount);
                expect(await arfv.balanceOf(treasury.address)).to.eq(0);
                expect(await treasury.totalReserves()).to.eq(amount.div(1e9));
            });
        });

        describe("with 0% excess reserve", function () {
            const setup50ExcessReserve = deployments.createFixture(async (hh) => {
                await toggleRights(treasury, MANAGING.REWARDMANAGER, deployer.address);
                await treasury.mintRewards(deployer.address, daiBalance.div(1e9));
            });

            beforeEach(async function () {
                await setup50ExcessReserve();
            });

            testsManage();

            it("Can't withdraw half balance", async function () {
                const amount = daiBalance.div(2);
                expect(machine.withdraw(dai.address, amount)).to.be.revertedWith(
                    "Insufficient reserves"
                );
            });
        });
    });

    describe("VAR assets", function () {
        const ravBalance = parseUnits("10", "ether");
        let ercFactory: MockContractFactory<MockToken__factory>;
        let rav: MockContract<MockToken>;

        const setupManagingVAR = deployments.createFixture(async (hh) => {
            ercFactory = await smock.mock<MockToken__factory>("MockToken");
            rav = await ercFactory.deploy(15);
            await rav.mint(treasury.address, ravBalance);
        });

        beforeEach(async function () {
            await setupManagingVAR();
        });

        it("Should manage RAV and not create ARFV", async function () {
            const totalReserve = await treasury.totalReserves();
            await machine.manage(rav.address, ravBalance);
            expect(await rav.balanceOf(machine.address)).to.eq(ravBalance);
            expect(await treasury.totalReserves()).to.eq(totalReserve);
            expect(await arfv.balanceOf(treasury.address)).to.eq(0);
        });

        it("Should withdraw RAV and not create ARFV", async function () {
            const totalReserve = await treasury.totalReserves();
            await machine.withdraw(rav.address, ravBalance);
            expect(await rav.balanceOf(machine.address)).to.eq(ravBalance);
            expect(await treasury.totalReserves()).to.eq(totalReserve);
            expect(await arfv.balanceOf(treasury.address)).to.eq(0);
        });
    });
});
