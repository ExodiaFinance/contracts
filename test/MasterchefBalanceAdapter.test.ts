import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import hre from "hardhat";

import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { externalAddressRegistry } from "../packages/sdk/contracts";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import {
    IMasterchef,
    IMasterchef__factory,
    MasterchefBalanceAdapter,
    MasterchefBalanceAdapter__factory,
} from "../packages/sdk/typechain";

import "./chai-setup";
const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, deploy, getNamedAccounts, getUnnamedAccounts, getNetwork } =
    xhre;

describe("MasterchefBalanceAdapter", function () {
    let deployer: SignerWithAddress;
    let daoAddress: string;
    let balanceAdapter: MasterchefBalanceAdapter;
    let BEETS_MASTERCHEF: string;
    let THE_MONOLITH_POOL: string;

    let daoLpBalance: BigNumber;

    beforeEach(async function () {
        await deployments.fixture([]);
        const { deployer: deployerAddress, DAO } = await getNamedAccounts();
        daoAddress = "0xC4e0cbe134c48085e8FF72eb31f0Ebca29b152ee";
        deployer = await xhre.ethers.getSigner(deployerAddress);
        const deployment = await deployments.deploy("MasterchefBalanceAdapter", {
            from: deployerAddress,
        });
        const addresses = await externalAddressRegistry.forNetwork(await getNetwork());
        BEETS_MASTERCHEF = addresses.BEETS_MASTERCHEF;
        THE_MONOLITH_POOL = addresses.THE_MONOLITH_POOL;
        balanceAdapter = await MasterchefBalanceAdapter__factory.connect(
            deployment.address,
            deployer
        );
        const FARM_PID = BigNumber.from(37);
        await balanceAdapter.addFarm(THE_MONOLITH_POOL, {
            contractAddress: BEETS_MASTERCHEF,
            pid: FARM_PID,
        });
        const userInfo = await IMasterchef__factory.connect(
            BEETS_MASTERCHEF,
            deployer
        ).userInfo(FARM_PID, daoAddress);
        daoLpBalance = userInfo.amount;
    });

    it("Should have one farm", async function () {
        const farm = await balanceAdapter.farmsForToken(THE_MONOLITH_POOL, 0);
        expect(farm.contractAddress).to.eq(BEETS_MASTERCHEF);
        expect(farm.pid).to.eq(37);
    });

    it("Should have a farm", async function () {
        await balanceAdapter.addFarm(THE_MONOLITH_POOL, {
            contractAddress: BEETS_MASTERCHEF,
            pid: 37,
        });
        const farm = await balanceAdapter.farmsForToken(THE_MONOLITH_POOL, 1);
        expect(farm.contractAddress).to.eq(BEETS_MASTERCHEF);
        expect(farm.pid).to.eq(37);
    });

    it("Should return the DAO LP in strat", async function () {
        expect(await balanceAdapter.balance(daoAddress, THE_MONOLITH_POOL)).to.eq(
            daoLpBalance
        );
    });

    it("Should add farms position", async function () {
        await balanceAdapter.addFarm(THE_MONOLITH_POOL, {
            contractAddress: BEETS_MASTERCHEF,
            pid: 37,
        });
        expect(await balanceAdapter.balance(daoAddress, THE_MONOLITH_POOL)).to.eq(
            daoLpBalance.mul(2)
        );
    });
});
