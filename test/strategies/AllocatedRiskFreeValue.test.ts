import { expect } from "chai";
import { parseUnits } from "ethers/lib/utils";
import hre from "hardhat";

import { ARFV_TOKEN_DID } from "../../deploy/31_deployARFVToken";
import { IExodiaContractsRegistry } from "../../packages/sdk/contracts/exodiaContracts";
import { IExtendedHRE } from "../../packages/HardhatRegistryExtension/ExtendedHRE";
import {
    AllocatedRiskFreeValue,
    AllocatedRiskFreeValue__factory,
    AssetAllocator__factory,
} from "../../packages/sdk/typechain";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;

describe("AllocatedRiskFreeValue token", function () {
    let arfv: AllocatedRiskFreeValue;
    let deployer: string;
    let randomAddress: string;
    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        const unnamedAccounts = await getUnnamedAccounts();
        deployer = namedAccounts.deployer;
        randomAddress = unnamedAccounts[0];
        await deployments.fixture([ARFV_TOKEN_DID]);
        const arfvDeployment = await get<AllocatedRiskFreeValue__factory>(
            "AllocatedRiskFreeValue"
        );
        arfv = arfvDeployment.contract;
    });

    it("Should be mintable by deployer", async function () {
        const bal0 = await arfv.balanceOf(deployer);
        const mintAmount = parseUnits("100", "ether");
        await arfv.mint(mintAmount);
        const bal1 = await arfv.balanceOf(deployer);
        expect(bal1).to.eq(bal0.add(mintAmount));
        expect(await arfv.totalSupply()).to.eq(mintAmount);
    });

    it("Should be burnable", async function () {
        const mintAmount = parseUnits("100", "ether");
        await arfv.mint(mintAmount);
        const bal = await arfv.balanceOf(deployer);
        await arfv.burn(bal);
        expect(await arfv.balanceOf(deployer)).to.eq(0);
        expect(await arfv.totalSupply()).to.eq(0);
    });

    it("Should not be mintable by non-minters", async function () {
        const signer = await xhre.ethers.getSigner(randomAddress);
        const arfvUser = AllocatedRiskFreeValue__factory.connect(arfv.address, signer);
        expect(arfvUser.mint(10)).to.be.revertedWith("ARFV: caller is not minter");
    });

    it("Should add/remove minters", async function () {
        expect(await arfv.isMinter(randomAddress)).to.be.false;
        await arfv.addMinter(randomAddress);
        expect(await arfv.isMinter(randomAddress)).to.be.true;
        await arfv.removeMinter(randomAddress);
        expect(await arfv.isMinter(randomAddress)).to.be.false;
    });

    it("Should only be able to add minter if policy", async function () {
        const signer = await xhre.ethers.getSigner(randomAddress);
        const arfvUser = AllocatedRiskFreeValue__factory.connect(arfv.address, signer);
        expect(arfvUser.addMinter(deployer)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
    });

    it("Should only be able to remove minter if policy", async function () {
        const signer = await xhre.ethers.getSigner(randomAddress);
        const arfvUser = AllocatedRiskFreeValue__factory.connect(arfv.address, signer);
        expect(arfvUser.removeMinter(deployer)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
    });
});
