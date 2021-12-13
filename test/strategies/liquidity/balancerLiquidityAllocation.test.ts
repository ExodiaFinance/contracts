import { expect } from "chai";
import hre from "hardhat";

import { TREASURY_DID } from "../../../deploy/03_deployTreasury";
import { OHM_SET_VAULT_DID } from "../../../deploy/04_setVault";
import { IExodiaContractsRegistry } from "../../../src/contracts/exodiaContracts";
import { IExtendedHRE } from "../../../src/HardhatRegistryExtension/ExtendedHRE";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts } = xhre;

describe("test treasury", function () {
    beforeEach(async function () {
        await deployments.fixture([TREASURY_DID]);
    });
    /*
    it("Should be deployed", async function () {
        const { contract: treasury } = await get<OlympusTreasury__factory>(
            "OlympusTreasury"
        );
        const { deployer } = await getNamedAccounts();
        expect(treasury.address).to.not.be.undefined;
        expect(await treasury.manager()).to.be.equal(deployer);
    });*/
});
