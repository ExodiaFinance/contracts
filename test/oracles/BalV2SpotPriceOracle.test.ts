import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import hre from "hardhat";

import { externalAddressRegistry } from "../../packages/sdk/contracts";
import { IExodiaContractsRegistry } from "../../packages/sdk/contracts/exodiaContracts";
import { IExtendedHRE } from "../../packages/HardhatRegistryExtension/ExtendedHRE";
import { ZERO_ADDRESS } from "../../packages/utils/utils";
import {
    AggregatorV3Interface__factory,
    BalV2SpotPriceOracle__factory,
    IVault__factory,
} from "../../packages/sdk/typechain";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, deploy, getNetwork } = xhre;

export const WBTC_ADDRESS = "0x321162Cd933E2Be498Cd2267a90534A804051b11";
export const USDC_ADDRESS = "0x04068da6c83afcfa0e13ba15a6696662335d5b75";
export const ETH_ADDRESS = "0x74b23882a30290451A17c44f4F05243b6b58C76d";
export const BEETHOVEN_SUBGRAPH =
    "https://graph-node.beets-ftm-node.com/subgraphs/name/beethovenx";
export const A_LATE_QUARTET =
    "0xf3a602d30dcb723a74a0198313a7551feaca7dac00010000000000000000005f";
const A_LATE_QUARTET_ADDRESS = "0xf3A602d30dcB723A74a0198313a7551FEacA7DAc";
const THE_E_MAJOR = "0xa07de66aef84e2c01d88a48d57d1463377ee602b000200000000000000000002";
const THE_E_MAJOR_ADDRESS = "0xA07De66AeF84e2c01D88a48D57D1463377Ee602b";
const BTC_USD_FEED = "0x8e94C22142F4A64b99022ccDd994f4e9EC86E4B4";
const ETH_USD_FEED = "0x11DdD3d147E5b83D01cee7070027092397d63658";
const FTM_USD_FEED = "0xf4766552D15AE4d256Ad41B6cf2933482B0680dc";

describe("Beethoven X token spot price oracle V2", function () {
    let deployer: string;

    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
    });

    it("Should get the price of 1 token with 8 decimals for equal weights", async function () {
        const oracleDeployment = await deployments.deploy("BalV2SpotPriceOracle", {
            args: [],
            from: deployer,
        });
        const { BEETHOVEN_VAULT } = externalAddressRegistry.forNetwork(
            await getNetwork()
        );
        const signer = await xhre.ethers.getSigner(deployer);
        const oracle = BalV2SpotPriceOracle__factory.connect(
            oracleDeployment.address,
            signer
        );
        const FTM_INDEX = 1;
        const BTC_INDEX = 2;
        const ETH_INDEX = 3;
        await oracle.setup(
            BEETHOVEN_VAULT,
            A_LATE_QUARTET,
            FTM_INDEX,
            [BTC_INDEX, ETH_INDEX],
            [BTC_USD_FEED, ETH_USD_FEED]
        );
        const ftmPrice = await oracle.getPrice();

        const ftmFeedAnswer = await AggregatorV3Interface__factory.connect(
            FTM_USD_FEED,
            signer
        ).latestRoundData();
        const ftmOracle = ftmFeedAnswer.answer;
        expect(ftmPrice).to.be.closeTo(ftmOracle, 5e7);
    });

    it("Should get the price of 1 token with 8 decimals for unequal weights", async function () {
        const oracleDeployment = await deployments.deploy("BalV2SpotPriceOracle", {
            args: [],
            from: deployer,
        });
        const { BEETHOVEN_VAULT } = externalAddressRegistry.forNetwork(
            await getNetwork()
        );
        const signer = await xhre.ethers.getSigner(deployer);
        const oracle = BalV2SpotPriceOracle__factory.connect(
            oracleDeployment.address,
            signer
        );
        const ETH_INDEX = 1;
        await oracle.setup(BEETHOVEN_VAULT, THE_E_MAJOR, 0, [ETH_INDEX], [ETH_USD_FEED]);
        const price = await oracle.getPrice();

        expect(price).to.be.closeTo(BigNumber.from(1e8), 5e7);
    });

    it("Should deploy EXOD price oracle", async function () {
        const oracleDeployment = await deployments.deploy("BalV2SpotPriceOracle", {
            args: [],
            from: deployer,
        });
        const signer = await xhre.ethers.getSigner(deployer);
        const oracle = BalV2SpotPriceOracle__factory.connect(
            oracleDeployment.address,
            signer
        );
        const FTM_INDEX = 0;
        const EXOD_INDEX = 1;
        const { BEETHOVEN_VAULT, THE_MONOLITH_POOLID, THE_MONOLITH_POOL } =
            externalAddressRegistry.forNetwork(await getNetwork());
        await oracle.setup(
            BEETHOVEN_VAULT,
            THE_MONOLITH_POOLID,
            EXOD_INDEX,
            [FTM_INDEX],
            [FTM_USD_FEED]
        );
        const price = await oracle.getPrice();
        const ftmFeedAnswer = await AggregatorV3Interface__factory.connect(
            FTM_USD_FEED,
            signer
        ).latestRoundData();
        const ftmUsd = ftmFeedAnswer.answer;
        const poolTokens = await IVault__factory.connect(
            BEETHOVEN_VAULT,
            signer
        ).getPoolTokens(THE_MONOLITH_POOLID);
        const ftmValue = ftmUsd.mul(poolTokens.balances[FTM_INDEX]);
        const exodPrice = ftmValue.div(poolTokens.balances[EXOD_INDEX]).div(1e9);
        expect(price).to.be.closeTo(exodPrice, 1e7);
    });

    it("BalV2SpotPriceOracle should only let policy call setup", async function () {
        const oracleDeployment = await deployments.deploy("BalV2SpotPriceOracle", {
            args: [],
            from: deployer,
        });
        const [account] = await xhre.getUnnamedAccounts();
        const signer = await xhre.ethers.getSigner(account);
        const contract = BalV2SpotPriceOracle__factory.connect(
            oracleDeployment.address,
            signer
        );
        const { BEETHOVEN_VAULT, THE_MONOLITH_POOLID } =
            externalAddressRegistry.forNetwork(await getNetwork());
        expect(
            contract.setup(BEETHOVEN_VAULT, THE_MONOLITH_POOLID, 0, [1], [FTM_USD_FEED])
        ).to.be.revertedWith("Ownable: caller is not the owner");
    });
});
