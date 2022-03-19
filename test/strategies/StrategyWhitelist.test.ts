import { MockContract, MockContractFactory, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseEther, parseUnits } from "ethers/lib/utils";
import hre from "hardhat";

import { PNLTRACKER_DID } from "../../deploy/46_deployPnlTracker";
import { STRATEGY_WHITELIST_DID } from "../../deploy/48_deployStrategyWhitelist.test";
import { IExtendedHRE } from "../../packages/HardhatRegistryExtension/ExtendedHRE";
import { IExodiaContractsRegistry } from "../../packages/sdk/contracts/exodiaContracts";
import {
    PNLTracker,
    PNLTracker__factory,
    StrategyWhitelist,
    StrategyWhitelist__factory,
} from "../../packages/sdk/typechain";
import "../chai-setup";
import { ZERO_ADDRESS } from "../../packages/utils/utils";
import { increaseTime } from "../testUtils";
const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;

describe("StrategyWhitelist", function () {
    let deployer: SignerWithAddress;
    let otherAccount: SignerWithAddress;

    let strat0: string;
    let strat1: string;

    let wl: StrategyWhitelist;

    // Use a fixture to deploy new contracts to speed up testing time
    const setup = deployments.createFixture(async (hh) => {
        strat0 = (await getUnnamedAccounts())[0];
        strat1 = (await getUnnamedAccounts())[1];
        await deployments.fixture([STRATEGY_WHITELIST_DID]);
        const trackerDeployment = await get<StrategyWhitelist__factory>(
            "StrategyWhitelist"
        );
        wl = trackerDeployment.contract;
        await wl.addMachine(deployer.address);
    });

    beforeEach(async function () {
        const { deployer: deployerAddress } = await getNamedAccounts();
        const [address0] = await getUnnamedAccounts();
        deployer = await xhre.ethers.getSigner(deployerAddress);
        otherAccount = await xhre.ethers.getSigner(address0);
        await setup();
    });

    it("Should add strategy to whitelist", async function () {
        await wl.add(strat0);
        expect(await wl.isWhitelisted(strat0)).to.be.true;
        expect(await wl.isWhitelisted(strat1)).to.be.false;
    });

    it("Should remove strategy to whitelist", async function () {
        await wl.add(strat0);
        await wl.remove(strat0);
        expect(await wl.isWhitelisted(strat0)).to.be.false;
        expect(await wl.isWhitelisted(strat1)).to.be.false;
    });

    it("Should only let architect add strategy", async function () {
        await expect(wl.connect(otherAccount).add(strat0)).to.be.revertedWith(
            "caller is not an architect"
        );
    });

    it("Should only let architect remove strategy", async function () {
        await expect(wl.connect(otherAccount).remove(strat0)).to.be.revertedWith(
            "caller is not an architect"
        );
    });
});
