import { MockContract, MockContractFactory, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseEther, parseUnits } from "ethers/lib/utils";
import hre from "hardhat";

import { PNLTRACKER_DID } from "../../deploy/46_deployPnlTracker";
import { IExtendedHRE } from "../../packages/HardhatRegistryExtension/ExtendedHRE";
import { IExodiaContractsRegistry } from "../../packages/sdk/contracts/exodiaContracts";
import { PNLTracker, PNLTracker__factory } from "../../packages/sdk/typechain";
import "../chai-setup";
import { ZERO_ADDRESS } from "../../packages/utils/utils";
import { increaseTime } from "../testUtils";
const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;

describe("PNL tracker", function () {
    let deployer: SignerWithAddress;
    let otherAccount: SignerWithAddress;

    let pnlTracker: PNLTracker;

    // Use a fixture to deploy new contracts to speed up testing time
    const setup = deployments.createFixture(async (hh) => {
        await deployments.fixture([PNLTRACKER_DID]);
        const trackerDeployment = await get<PNLTracker__factory>("PNLTracker");
        pnlTracker = trackerDeployment.contract;
        await pnlTracker.addMachine(deployer.address);
    });

    beforeEach(async function () {
        const { deployer: deployerAddress } = await getNamedAccounts();
        const [address0] = await getUnnamedAccounts();
        deployer = await xhre.ethers.getSigner(deployerAddress);
        otherAccount = await xhre.ethers.getSigner(address0);
        await setup();
    });

    it("Should set the FIRST_WEEK", async function () {
        expect(await pnlTracker.FIRST_WEEK()).to.eq(await pnlTracker.getCurrentWeek());
    });

    it("Should return current week", async function () {
        expect(await pnlTracker.getCurrentWeek()).to.eq(
            BigNumber.from(Date.now()).div(86400 * 7 * 1000)
        );
    });

    it("Should only let machine call track", async function () {
        await expect(
            pnlTracker.connect(otherAccount).track(ZERO_ADDRESS, parseEther("1"))
        ).to.be.revertedWith("caller is not a machine");
    });

    it("Should track profits", async function () {
        const pnl0 = parseEther("1");
        await pnlTracker.track(ZERO_ADDRESS, pnl0);
        const week = await pnlTracker.getCurrentWeek();
        expect(await pnlTracker.weeksPnl(week, ZERO_ADDRESS)).to.eq(pnl0);
        const pnl1 = parseEther("2");
        await pnlTracker.track(ZERO_ADDRESS, pnl1);
        expect(await pnlTracker.weeksPnl(week, ZERO_ADDRESS)).to.eq(pnl0.add(pnl1));
        const pnl2 = parseEther("-7");
        await pnlTracker.track(ZERO_ADDRESS, pnl2);
        expect(await pnlTracker.weeksPnl(week, ZERO_ADDRESS)).to.eq(
            pnl0.add(pnl1).add(pnl2)
        );
    });

    it("Should reset every week", async function () {
        const pnl0 = parseEther("1");
        await pnlTracker.track(ZERO_ADDRESS, pnl0);
        await increaseTime(xhre, 86400 * 7);
        const week = await pnlTracker.getCurrentWeek();
        expect(await pnlTracker.weeksPnl(week, ZERO_ADDRESS)).to.eq(0);
    });
});
