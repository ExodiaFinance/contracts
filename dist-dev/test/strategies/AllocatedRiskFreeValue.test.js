"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const utils_1 = require("ethers/lib/utils");
const hardhat_1 = __importDefault(require("hardhat"));
const _31_deployARFVToken_1 = require("../../deploy/31_deployARFVToken");
const typechain_1 = require("../../packages/sdk/typechain");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts, getUnnamedAccounts } = xhre;
describe("AllocatedRiskFreeValue token", function () {
    let arfv;
    let deployer;
    let randomAddress;
    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        const unnamedAccounts = await getUnnamedAccounts();
        deployer = namedAccounts.deployer;
        randomAddress = unnamedAccounts[0];
        await deployments.fixture([_31_deployARFVToken_1.ARFV_TOKEN_DID]);
        const arfvDeployment = await get("AllocatedRiskFreeValue");
        arfv = arfvDeployment.contract;
    });
    it("Should be mintable by deployer", async function () {
        const bal0 = await arfv.balanceOf(deployer);
        const mintAmount = (0, utils_1.parseUnits)("100", "ether");
        await arfv.mint(mintAmount);
        const bal1 = await arfv.balanceOf(deployer);
        (0, chai_1.expect)(bal1).to.eq(bal0.add(mintAmount));
        (0, chai_1.expect)(await arfv.totalSupply()).to.eq(mintAmount);
    });
    it("Should be burnable", async function () {
        const mintAmount = (0, utils_1.parseUnits)("100", "ether");
        await arfv.mint(mintAmount);
        const bal = await arfv.balanceOf(deployer);
        await arfv.burn(bal);
        (0, chai_1.expect)(await arfv.balanceOf(deployer)).to.eq(0);
        (0, chai_1.expect)(await arfv.totalSupply()).to.eq(0);
    });
    it("Should not be mintable by non-minters", async function () {
        const signer = await xhre.ethers.getSigner(randomAddress);
        const arfvUser = typechain_1.AllocatedRiskFreeValue__factory.connect(
            arfv.address,
            signer
        );
        (0, chai_1.expect)(arfvUser.mint(10)).to.be.revertedWith(
            "ARFV: caller is not minter"
        );
    });
    it("Should add/remove minters", async function () {
        (0, chai_1.expect)(await arfv.isMinter(randomAddress)).to.be.false;
        await arfv.addMinter(randomAddress);
        (0, chai_1.expect)(await arfv.isMinter(randomAddress)).to.be.true;
        await arfv.removeMinter(randomAddress);
        (0, chai_1.expect)(await arfv.isMinter(randomAddress)).to.be.false;
    });
    it("Should only be able to add minter if policy", async function () {
        const signer = await xhre.ethers.getSigner(randomAddress);
        const arfvUser = typechain_1.AllocatedRiskFreeValue__factory.connect(
            arfv.address,
            signer
        );
        (0, chai_1.expect)(arfvUser.addMinter(deployer)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
    });
    it("Should only be able to remove minter if policy", async function () {
        const signer = await xhre.ethers.getSigner(randomAddress);
        const arfvUser = typechain_1.AllocatedRiskFreeValue__factory.connect(
            arfv.address,
            signer
        );
        (0, chai_1.expect)(arfvUser.removeMinter(deployer)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
    });
});
