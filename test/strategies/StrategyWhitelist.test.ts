import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import hre from "hardhat";

import { STRATEGY_WHITELIST_DID } from "../../deploy/48_deployStrategyWhitelist.test";
import { IExtendedHRE } from "../../packages/HardhatRegistryExtension/ExtendedHRE";
import { IExodiaContractsRegistry } from "../../packages/sdk/contracts/exodiaContracts";
import {
    StrategyWhitelist,
    StrategyWhitelist__factory,
} from "../../packages/sdk/typechain";
import { ZERO_ADDRESS } from "../../packages/utils/utils";
import "../chai-setup";
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

    it("Should revert when adding null address", async function () {
        await expect(wl.add(ZERO_ADDRESS)).to.be.revertedWith(
            "WL: can't add null address"
        );
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
