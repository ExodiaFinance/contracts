import { MockContract, MockContractFactory, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import hre from "hardhat";

import "./chai-setup";
import { FARMER_DID } from "../../deploy/41_deployFarmer";
import { IExodiaContractsRegistry } from "../../packages/sdk/contracts/exodiaContracts";
import { IExtendedHRE } from "../../packages/HardhatRegistryExtension/ExtendedHRE";
import { Farmer, Farmer__factory } from "../../packages/sdk/typechain";
const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;

describe("Start test file", function () {
    let deployer: SignerWithAddress;
    let otherAccount: SignerWithAddress;

    let farmer: Farmer;

    // Use a fixture to deploy new contracts to speed up testing time
    const setup = deployments.createFixture(async (hh) => {
        await deployments.fixture([FARMER_DID]);

        const farmerDeployment = await get<Farmer__factory>("Farmer");
        farmer = farmerDeployment.contract;
    });

    beforeEach(async function () {
        const { deployer: deployerAddress } = await getNamedAccounts();
        const [address0] = await getUnnamedAccounts();
        deployer = await xhre.ethers.getSigner(deployerAddress);
        otherAccount = await xhre.ethers.getSigner(address0);
        await setup();
    });

    it("Should set a limit", async function () {
        await farmer.setLimit();
    });
});
