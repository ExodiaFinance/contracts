import { MockContract, smock } from "@defi-wonderland/smock";
import { MockContractFactory } from "@defi-wonderland/smock/dist/src/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { parseUnits } from "ethers/lib/utils";
import hre from "hardhat";

import { TREASURY_DEPOSITOR_DID } from "../../deploy/40_deployTreasuryDepositor";
import { IExodiaContractsRegistry } from "../../packages/sdk/contracts/exodiaContracts";
import { IExtendedHRE } from "../../packages/HardhatRegistryExtension/ExtendedHRE";
import toggleRights, { MANAGING } from "../../packages/utils/toggleRights";
import {
    AllocatedRiskFreeValue,
    AllocatedRiskFreeValue__factory,
    DAI,
    DAI__factory,
    MockToken,
    MockToken__factory,
    OlympusTreasury,
    OlympusTreasury__factory,
    TreasuryDepositor,
    TreasuryDepositor__factory,
} from "../../packages/sdk/typechain";
import "../chai-setup";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;

describe("TreasuryDepositor", function () {
    let deployer: SignerWithAddress;
    let otherAccount: SignerWithAddress;

    let dai: DAI;
    let treasury: OlympusTreasury;
    let depositor: TreasuryDepositor;
    let arfv: AllocatedRiskFreeValue;
    let machine: MockContract<TreasuryDepositor>;

    const setup = deployments.createFixture(async (hh) => {
        await deployments.fixture([TREASURY_DEPOSITOR_DID]);
        const depositorDeployment = await get<TreasuryDepositor__factory>(
            "TreasuryDepositor"
        );
        depositor = depositorDeployment.contract;
        const machineFactory = await smock.mock("TreasuryDepositorMockMachine");
        machine = (await machineFactory.deploy(
            depositor.address
        )) as unknown as MockContract<TreasuryDepositor>;
        await depositor.addMachine(machine.address);
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

    describe("RFV", function () {
        const daiBalance = parseUnits("10000", "ether");
        const mintDAI = deployments.createFixture(async (xhh) => {
            await dai.mint(deployer.address, daiBalance);
            await dai.approve(machine.address, daiBalance);
        });

        beforeEach(async () => {
            await mintDAI();
        });

        describe("deposit()", function () {
            const deposit = deployments.createFixture(async (hh) => {
                await machine.deposit(dai.address, daiBalance);
            });

            beforeEach(async function () {
                await deposit();
            });

            it("Should have deposited DAI in Treasury", async function () {
                expect(await dai.balanceOf(treasury.address)).to.eq(daiBalance);
            });

            it("Should have increased totalReserves", async function () {
                expect(await treasury.totalReserves()).to.eq(daiBalance.div(1e9));
            });
        });

        describe("returnFunds", function () {
            const arfvBalance = daiBalance.div(1e9);
            const daiBorrowed = arfvBalance.mul(1e9);

            const depositArfv = deployments.createFixture(async (hh) => {
                await arfv.mint(arfvBalance);
                await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, deployer.address);
                await arfv.approve(treasury.address, arfvBalance);
                await treasury.deposit(arfvBalance, arfv.address, arfvBalance);
            });

            beforeEach(async function () {
                await depositArfv();
            });

            it("Should withdraw arfv and deposit dai", async function () {
                await machine.returnFunds(dai.address, daiBalance);
                expect(await dai.balanceOf(treasury.address)).to.eq(daiBalance);
                expect(await arfv.balanceOf(treasury.address)).to.eq(
                    arfvBalance.sub(daiBalance.div(1e9))
                );
            });

            it("Should fail to return more RFV than there is ARFV", async function () {
                const newMint = parseUnits("1000000000000", "ether");
                const newBalance = daiBalance.add(newMint);
                await dai.mint(deployer.address, newMint);
                await dai.approve(machine.address, newBalance);
                expect(machine.returnFunds(dai.address, newBalance)).to.be.revertedWith(
                    "ERC20: transfer amount exceeds balance"
                );
            });

            it("Should register profit", async function () {
                const profits = parseUnits("1000000000000", "ether");
                const newBalance = daiBalance.add(profits);
                await dai.mint(deployer.address, profits);
                await dai.approve(machine.address, newBalance);
                await machine.returnWithProfits(
                    dai.address,
                    daiBorrowed,
                    newBalance.sub(daiBorrowed)
                );
                expect(await dai.balanceOf(treasury.address)).to.eq(newBalance);
                expect(await treasury.totalReserves()).to.eq(newBalance.div(1e9));
                expect(await arfv.balanceOf(treasury.address)).to.eq(0);
            });

            it("Should register loss", async function () {
                const loss = parseUnits("10", "ether");
                const newBalance = daiBalance.sub(loss);
                await machine.returnWithLoss(dai.address, daiBorrowed, loss);
                expect(await dai.balanceOf(treasury.address)).to.eq(newBalance);
                expect(await treasury.totalReserves()).to.eq(newBalance.div(1e9));
                expect(await arfv.balanceOf(treasury.address)).to.eq(0);
            });
        });
    });

    describe("VAR assets", function () {
        const varBalance = parseUnits("100", "ether");
        let ercFactory: MockContractFactory<MockToken__factory>;
        let varToken: MockContract<MockToken>;

        const setupVAR = deployments.createFixture(async (hh) => {
            ercFactory = await smock.mock<MockToken__factory>("MockToken");
            varToken = await ercFactory.deploy(15);
            await varToken.mint(deployer.address, varBalance);
            await varToken.approve(machine.address, varBalance);
        });

        beforeEach(async function () {
            await setupVAR();
        });

        it("Should deposit funds and not touch reserves", async function () {
            await machine.deposit(varToken.address, varBalance);
            expect(await treasury.totalReserves()).to.eq(0);
        });

        describe("Return VAR", function () {
            const arfvBalance = parseUnits("100", "ether");
            const varProfits = varBalance.div(2);
            const varBorrowed = varBalance.div(2);

            const depositArfv = deployments.createFixture(async (hh) => {
                await arfv.mint(arfvBalance);
                await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, deployer.address);
                await arfv.approve(treasury.address, arfvBalance);
                await treasury.deposit(arfvBalance, arfv.address, arfvBalance);
            });

            beforeEach(async function () {
                await depositArfv();
            });

            it("Should returnFunds and not increase reserves or remove ARFV", async function () {
                await machine.returnFunds(varToken.address, varBalance);
                expect(await arfv.balanceOf(treasury.address)).to.eq(arfvBalance);
                expect(await varToken.balanceOf(treasury.address)).to.eq(varBalance);
                expect(await treasury.totalReserves()).to.eq(arfvBalance);
            });

            it("Should returnWithProfits and not increase reserves or remove ARFV", async function () {
                await machine.returnWithProfits(
                    varToken.address,
                    varBorrowed,
                    varProfits
                );
                expect(await arfv.balanceOf(treasury.address)).to.eq(arfvBalance);
                expect(await varToken.balanceOf(treasury.address)).to.eq(varBalance);
                expect(await treasury.totalReserves()).to.eq(arfvBalance);
            });

            it("Should returnWithLoss and not decrease reserves or remove ARFV", async function () {
                const varLoss = varProfits;
                await machine.returnWithLoss(varToken.address, varBalance, varLoss);
                expect(await arfv.balanceOf(treasury.address)).to.eq(arfvBalance);
                expect(await varToken.balanceOf(treasury.address)).to.eq(
                    varBalance.sub(varLoss)
                );
                expect(await treasury.totalReserves()).to.eq(arfvBalance);
            });
        });
    });

    describe("RemoveARFVFromTreasury", function () {
        const arfvBalance = parseUnits("100", "ether");
        const varBalance = parseUnits("100", "ether");
        let ercFactory: MockContractFactory<MockToken__factory>;
        let varToken: MockContract<MockToken>;

        const setupArfvTest = deployments.createFixture(async (hh) => {
            await arfv.mint(arfvBalance);
            await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, deployer.address);
            await arfv.approve(treasury.address, arfvBalance);
            await treasury.deposit(arfvBalance, arfv.address, arfvBalance);
            ercFactory = await smock.mock<MockToken__factory>("MockToken");
            varToken = await ercFactory.deploy(15);
            await varToken.mint(deployer.address, varBalance);
            await varToken.approve(machine.address, varBalance);
        });

        beforeEach(async function () {
            await setupArfvTest();
        });

        it("Should remove all ARFV", async function () {
            await machine.removeARFVFromTreasury(dai.address, arfvBalance.mul(1e9));
            expect(await arfv.balanceOf(treasury.address)).to.eq(0);
            expect(await treasury.totalReserves()).to.eq(0);
        });

        it("Should not remove ARFV", async function () {
            await machine.removeARFVFromTreasury(varToken.address, varBalance);
            expect(await arfv.balanceOf(treasury.address)).to.eq(arfvBalance);
            expect(await treasury.totalReserves()).to.eq(arfvBalance);
        });
    });

    describe("Permissions", function () {
        const testPermissions = (error: string, caller: string) => {
            it(`Should only let ${caller} use returnFunds`, async function () {
                expect(depositor.returnFunds(dai.address, 1000)).to.be.revertedWith(
                    error
                );
            });

            it(`Should only let ${caller} use returnWithProfits`, async function () {
                expect(
                    depositor.returnWithProfits(dai.address, 1000, 10)
                ).to.be.revertedWith(error);
            });

            it(`Should only let ${caller} use returnWithLoss`, async function () {
                expect(
                    depositor.returnWithLoss(dai.address, 1000, 10)
                ).to.be.revertedWith(error);
            });

            it(`Should only let ${caller} use deposit`, async function () {
                expect(depositor.deposit(dai.address, 1000)).to.be.revertedWith(error);
            });

            it(`Should only let ${caller} burn ARFV`, async function () {
                expect(
                    depositor.removeARFVFromTreasury(dai.address, 1000)
                ).to.be.revertedWith(error);
            });
        };

        testPermissions("caller is not a machine", "machine");

        describe("as machine", function () {
            const addMachine = deployments.createFixture(async (hh) => {
                await depositor.addMachine(deployer.address);
            });

            beforeEach(async function () {
                await addMachine();
            });

            testPermissions("caller is not a contract", "contract");
        });
    });
});
