import { expect } from "chai";
import hre from "hardhat";

import { TREASURY_DID } from "../deploy/03_deployTreasury";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import mint from "../packages/utils/mint";
import toggleRights, { MANAGING } from "../packages/utils/toggleRights";
import { DAI_DECIMALS, OHM_DECIMALS, toWei } from "../packages/utils/utils";
import {
    DAI__factory,
    OlympusERC20Token__factory,
    OlympusTreasury__factory,
} from "../packages/sdk/typechain";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts } = xhre;

describe("test treasury", function () {
    beforeEach(async function () {
        await deployments.fixture([TREASURY_DID]);
    });

    it("Should be deploy", async function () {
        const { contract: treasury } = await get<OlympusTreasury__factory>(
            "OlympusTreasury"
        );
        const { deployer } = await getNamedAccounts();
        expect(treasury.address).to.not.be.undefined;
        expect(await treasury.manager()).to.be.equal(deployer);
    });

    it("Should be able to deposit", async function () {
        const { contract: treasury } = await get<OlympusTreasury__factory>(
            "OlympusTreasury"
        );
        const { deployer } = await getNamedAccounts();
        await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, deployer);
        expect(await treasury.isReserveDepositor(deployer)).to.be.true;
    });

    it("Should not be able to deposit", async function () {
        const { contract: treasury } = await get<OlympusTreasury__factory>(
            "OlympusTreasury"
        );
        const { deployer } = await getNamedAccounts();
        expect(await treasury.isReserveDepositor(deployer)).to.be.false;
    });

    it("Should mint 1 OHM", async function () {
        const { deployer } = await getNamedAccounts();
        const { contract: treasury } = await get<OlympusTreasury__factory>(
            "OlympusTreasury"
        );
        const { contract: ohm } = await get<OlympusERC20Token__factory>(
            "OlympusERC20Token"
        );
        const { contract: dai } = await get<DAI__factory>("DAI");
        await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, deployer);
        await mint(deployer, treasury, dai, toWei(1, DAI_DECIMALS));
        const ohmBalance = await ohm.balanceOf(deployer);
        expect(ohmBalance.toString()).to.eq(toWei(1, OHM_DECIMALS));
    });
});
