import { smock } from "@defi-wonderland/smock";
import { MockContract, MockContractFactory } from "@defi-wonderland/smock/dist/src/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import hre from "hardhat";

import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import {
    AllocationCalculator__factory,
    AssetAllocator__factory,
    MasterchefBalanceAdapter,
    MasterchefBalanceAdapter__factory,
    MockToken,
    MockToken__factory,
    TreasuryTracker,
    TreasuryTracker__factory,
} from "../packages/sdk/typechain";
import { ZERO_ADDRESS } from "../packages/utils/utils";

import "./chai-setup";
const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, deploy, getNamedAccounts, getUnnamedAccounts } = xhre;

describe("Treasury Tracker", function () {
    let ercFactory: MockContractFactory<MockToken__factory>;
    let rfvToken: MockContract<MockToken>;
    let varToken: MockContract<MockToken>;
    let bptToken: MockContract<MockToken>;
    let uniLpToken: MockContract<MockToken>;
    let deployer: SignerWithAddress;
    let unnamedSigner: SignerWithAddress;
    let daoAddress: string;
    let treasuryAddress: string;

    let treasuryTracker: TreasuryTracker;
    let adapter: MockContract<MasterchefBalanceAdapter>;

    const treasuryBalance = parseUnits("10000", "ether");
    const daoBalance = parseUnits("1000", "ether");
    const adapterBalance = parseUnits("100", "ether");

    const setup = deployments.createFixture(async (hh) => {
        const { deployer: deployerAddress } = await getNamedAccounts();
        const [unnamed, DAO, treasury] = await getUnnamedAccounts();
        daoAddress = DAO;
        treasuryAddress = treasury;
        deployer = await xhre.ethers.getSigner(deployerAddress);
        unnamedSigner = await xhre.ethers.getSigner(unnamed);
        ercFactory = await smock.mock<MockToken__factory>("MockToken");
        rfvToken = await ercFactory.deploy(18);
        varToken = await ercFactory.deploy(18);
        bptToken = await ercFactory.deploy(18);
        uniLpToken = await ercFactory.deploy(18);

        const treasuryTrackerDeployment = await deployments.deploy("TreasuryTracker", {
            from: deployerAddress,
        });
        treasuryTracker = await TreasuryTracker__factory.connect(
            treasuryTrackerDeployment.address,
            deployer
        );
        const adapterFactory = await smock.mock<MasterchefBalanceAdapter__factory>(
            "MasterchefBalanceAdapter"
        );
        adapter = await adapterFactory.deploy();
        adapter.balance.returns(adapterBalance);
        await treasuryTracker.addRiskFreeAsset(rfvToken.address);
        await treasuryTracker.addAssetWithRisk(varToken.address);
        await treasuryTracker.addBPT(bptToken.address);
        await treasuryTracker.addUniLP(uniLpToken.address);
        await treasuryTracker.addContract(treasuryAddress);
        await treasuryTracker.addEOA(daoAddress);
        await treasuryTracker.addAdapter(adapter.address);

        await rfvToken.mint(treasuryAddress, treasuryBalance);
        await rfvToken.mint(daoAddress, daoBalance);
    });

    beforeEach(async function () {
        await setup();
    });

    it("Should have one risk free asset", async function () {
        expect(await treasuryTracker.getRiskFreeAssets()).to.have.members([
            rfvToken.address,
        ]);
    });

    it("Should have one asset with risk", async function () {
        expect(await treasuryTracker.getAssetsWithRisk()).to.have.members([
            varToken.address,
        ]);
    });

    it("Should have one bpt", async function () {
        expect(await treasuryTracker.getBPTs()).to.have.members([bptToken.address]);
    });

    it("Should have one UniLp", async function () {
        expect(await treasuryTracker.getUniLPs()).to.have.members([uniLpToken.address]);
    });

    it("Should have one contract", async function () {
        expect(await treasuryTracker.getContracts()).to.have.members([treasuryAddress]);
    });

    it("Should have one EOA", async function () {
        expect(await treasuryTracker.getEOAs()).to.have.members([daoAddress]);
    });

    it("Should have one adapter", async function () {
        expect(await treasuryTracker.getAdapters()).to.have.members([adapter.address]);
    });

    it("Should remove the rfa", async function () {
        await treasuryTracker.removeRiskFreeAsset(rfvToken.address);
        expect((await treasuryTracker.getRiskFreeAssets()).length).to.eq(0);
    });

    it("Should remove the var token address", async function () {
        await treasuryTracker.removeAssetWithRisk(varToken.address);
        expect((await treasuryTracker.getAssetsWithRisk()).length).to.eq(0);
    });

    it("Should remove the bpt", async function () {
        await treasuryTracker.removeBPT(bptToken.address);
        expect((await treasuryTracker.getBPTs()).length).to.eq(0);
    });

    it("Should remove the uniLP", async function () {
        await treasuryTracker.removeUniLP(uniLpToken.address);
        expect((await treasuryTracker.getUniLPs()).length).to.eq(0);
    });

    it("Should remove treasury contract", async function () {
        await treasuryTracker.removeContract(treasuryAddress);
        expect((await treasuryTracker.getContracts()).length).to.eq(0);
    });

    it("Should remove DAO address from EOA", async function () {
        await treasuryTracker.removeEOA(daoAddress);
        expect((await treasuryTracker.getEOAs()).length).to.eq(0);
    });

    it("Should remove the adapter", async function () {
        await treasuryTracker.removeAdapter(adapter.address);
        expect((await treasuryTracker.getAdapters()).length).to.eq(0);
    });

    it("Should return the total balance", async function () {
        expect(await treasuryTracker.balance(rfvToken.address)).to.eq(
            daoBalance.add(treasuryBalance).add(adapterBalance)
        );
        expect(adapter.balance).to.have.been.calledWith(daoAddress, rfvToken.address);
    });

    it("Should return the total balance with asset allocator", async function () {
        const assetAllocatorFactory = await smock.mock<AssetAllocator__factory>(
            "MockAssetAllocator"
        );
        const assetAllocator = await assetAllocatorFactory.deploy();
        const allocatedBalance = parseUnits("10", "ether");
        assetAllocator.allocatedBalance.returns(allocatedBalance);
        await treasuryTracker.setAllocator(assetAllocator.address);
        expect(await treasuryTracker.balance(rfvToken.address)).to.eq(
            daoBalance.add(treasuryBalance).add(adapterBalance).add(allocatedBalance)
        );
        expect(assetAllocator.allocatedBalance).to.have.been.calledWith(rfvToken.address);
    });

    it("Should return all the balances", async function () {
        const [tokens, balances] = await treasuryTracker.balances();
        expect(tokens).to.have.members([
            varToken.address,
            rfvToken.address,
            bptToken.address,
            uniLpToken.address,
        ]);
        expect(varToken.balanceOf).to.have.been.calledWith(treasuryAddress);
        expect(rfvToken.balanceOf).to.have.been.calledWith(treasuryAddress);
        expect(bptToken.balanceOf).to.have.been.calledWith(treasuryAddress);
        expect(uniLpToken.balanceOf).to.have.been.calledWith(treasuryAddress);
        expect(balances.map((b) => b.toString())).to.have.members([
            adapterBalance.toString(),
            daoBalance.add(treasuryBalance).add(adapterBalance).toString(),
            adapterBalance.toString(),
            adapterBalance.toString(),
        ]);
    });

    it("Should return no balances", async function () {
        await treasuryTracker.removeAssetWithRisk(varToken.address);
        await treasuryTracker.removeRiskFreeAsset(rfvToken.address);
        await treasuryTracker.removeBPT(bptToken.address);
        await treasuryTracker.removeUniLP(uniLpToken.address);
        const [tokens, balances] = await treasuryTracker.balances();
        expect(tokens.length).to.eq(0);
        expect(balances.length).to.eq(0);
    });

    it("Should return multiple balances from same category", async function () {
        await treasuryTracker.addAssetWithRisk(rfvToken.address);
        await treasuryTracker.addRiskFreeAsset(varToken.address);
        await treasuryTracker.addBPT(uniLpToken.address);
        await treasuryTracker.addUniLP(bptToken.address);
        const [tokens, balances] = await treasuryTracker.balances();
        expect(tokens).to.have.members([
            varToken.address,
            rfvToken.address,
            rfvToken.address,
            varToken.address,
            bptToken.address,
            uniLpToken.address,
            uniLpToken.address,
            bptToken.address,
        ]);
    });

    it("Should revert if asset if rfv already added", async function () {
        expect(treasuryTracker.addRiskFreeAsset(rfvToken.address)).to.be.revertedWith(
            "Asset already added"
        );
    });

    it("Should revert if asset if var already added", async function () {
        expect(treasuryTracker.addAssetWithRisk(varToken.address)).to.be.revertedWith(
            "Asset already added"
        );
    });

    it("Should revert if asset if bpt already added", async function () {
        expect(treasuryTracker.addBPT(bptToken.address)).to.be.revertedWith(
            "BPT already added"
        );
    });

    it("Should revert if asset if lp already added", async function () {
        expect(treasuryTracker.addUniLP(uniLpToken.address)).to.be.revertedWith(
            "LP already added"
        );
    });

    it("Should revert if address is already added", async function () {
        expect(treasuryTracker.addEOA(daoAddress)).to.be.revertedWith(
            "Address already added"
        );
    });

    it("Should revert if asset if contract already added", async function () {
        expect(treasuryTracker.addContract(treasuryAddress)).to.be.revertedWith(
            "Contract already added"
        );
    });

    it("Should revert if adapter is already added", async function () {
        expect(treasuryTracker.addAdapter(adapter.address)).to.be.revertedWith(
            "Adapter already added"
        );
    });

    describe("Not policy", function () {
        let tracker: TreasuryTracker;

        beforeEach(async function () {
            tracker = TreasuryTracker__factory.connect(
                treasuryTracker.address,
                unnamedSigner
            );
        });

        it("Should revert on addRiskFreeAssets if not policy", async function () {
            expect(tracker.addRiskFreeAsset(rfvToken.address)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("Should revert on addAssetsWithRisk if not policy", async function () {
            expect(tracker.addAssetWithRisk(varToken.address)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("Should revert on addBPT if not policy", async function () {
            expect(tracker.addBPT(bptToken.address)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("Should revert on addUniLP if not policy", async function () {
            expect(tracker.addUniLP(uniLpToken.address)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("Should revert on addEOA if not policy", async function () {
            expect(tracker.addEOA(daoAddress)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("Should revert on addAdapter if not policy", async function () {
            expect(tracker.addAdapter(adapter.address)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("Should revert on addRiskFreeAssets if not policy", async function () {
            expect(tracker.addRiskFreeAsset(rfvToken.address)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("Should revert on removeAssetsWithRisk if not policy", async function () {
            expect(tracker.removeAssetWithRisk(varToken.address)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("Should revert on removeBPT if not policy", async function () {
            expect(tracker.removeBPT(bptToken.address)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("Should revert on removeUniLP if not policy", async function () {
            expect(tracker.removeUniLP(uniLpToken.address)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("Should revert on removeEOA if not policy", async function () {
            expect(tracker.removeEOA(daoAddress)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("Should revert on removeAdapter if not policy", async function () {
            expect(tracker.removeAdapter(adapter.address)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });
    });
});
