"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.BEETHOVEN_SUBGRAPH = void 0;
const chai_1 = require("chai");
const hardhat_1 = __importDefault(require("hardhat"));
const _25_deployBPTMNLTpriceOracle_1 = require("../../deploy/25_deployBPTMNLTpriceOracle");
const contracts_1 = require("../../packages/sdk/contracts");
const typechain_1 = require("../../packages/sdk/typechain");
const xhre = hardhat_1.default;
const { deployments, get, getNamedAccounts, getNetwork } = xhre;
exports.BEETHOVEN_SUBGRAPH =
    "https://graph-node.beets-ftm-node.com/subgraphs/name/beethovenx";
const A_LATE_QUARTET =
    "0xf3a602d30dcb723a74a0198313a7551feaca7dac00010000000000000000005f";
const A_LATE_QUARTET_ADDRESS = "0xf3A602d30dcB723A74a0198313a7551FEacA7DAc";
const THE_E_MAJOR = "0xa07de66aef84e2c01d88a48d57d1463377ee602b000200000000000000000002";
const THE_E_MAJOR_ADDRESS = "0xA07De66AeF84e2c01D88a48D57D1463377Ee602b";
const BTC_USD_FEED = "0x8e94C22142F4A64b99022ccDd994f4e9EC86E4B4";
const ETH_USD_FEED = "0x11DdD3d147E5b83D01cee7070027092397d63658";
const FTM_USD_FEED = "0xf4766552D15AE4d256Ad41B6cf2933482B0680dc";
describe("Beethoven X BPT oracle V2", function () {
    let deployer;
    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
    });
    it("Should get the price of 1 BPT with 8 decimals for equal weights", async function () {
        const oracleDeployment = await deployments.deploy("BPTPriceOracleV2", {
            args: [],
            from: deployer,
        });
        const { BEETHOVEN_VAULT } = contracts_1.externalAddressRegistry.forNetwork(
            await getNetwork()
        );
        const signer = await xhre.ethers.getSigner(deployer);
        const oracle = typechain_1.BPTPriceOracleV2__factory.connect(
            oracleDeployment.address,
            signer
        );
        const FTM_INDEX = 1;
        const BTC_INDEX = 2;
        const ETH_INDEX = 3;
        await oracle.setup(
            BEETHOVEN_VAULT,
            A_LATE_QUARTET,
            [FTM_INDEX, BTC_INDEX, ETH_INDEX],
            [FTM_USD_FEED, BTC_USD_FEED, ETH_USD_FEED]
        );
        const price = await oracle.getPrice();
        const ethFeedAnswer = await typechain_1.AggregatorV3Interface__factory.connect(
            ETH_USD_FEED,
            signer
        ).latestRoundData();
        const ethUsd = ethFeedAnswer.answer;
        const btcFeedAnswer = await typechain_1.AggregatorV3Interface__factory.connect(
            BTC_USD_FEED,
            signer
        ).latestRoundData();
        const btcUsd = btcFeedAnswer.answer;
        const ftmFeedAnswer = await typechain_1.AggregatorV3Interface__factory.connect(
            FTM_USD_FEED,
            signer
        ).latestRoundData();
        const ftmUsd = ftmFeedAnswer.answer;
        const poolTokens = await typechain_1.IVault__factory.connect(
            BEETHOVEN_VAULT,
            signer
        ).getPoolTokens(A_LATE_QUARTET);
        const lpSupply = await typechain_1.IERC20__factory.connect(
            A_LATE_QUARTET_ADDRESS,
            signer
        ).totalSupply();
        const ethValue = ethUsd.mul(poolTokens.balances[ETH_INDEX]);
        const btcValue = btcUsd.mul(poolTokens.balances[BTC_INDEX].mul(1e10));
        const ftmValue = ftmUsd.mul(poolTokens.balances[FTM_INDEX]);
        const monitoredAssetValue = ethValue.add(btcValue).add(ftmValue);
        const poolValue = monitoredAssetValue.mul(100).div(75);
        (0, chai_1.expect)(price).to.be.closeTo(poolValue.div(lpSupply), 1e10);
    });
    it("Should get the price of 1 BPT with 8 decimals for unequal weights", async function () {
        const oracleDeployment = await deployments.deploy("BPTPriceOracleV2", {
            args: [],
            from: deployer,
        });
        const { BEETHOVEN_VAULT } = contracts_1.externalAddressRegistry.forNetwork(
            await getNetwork()
        );
        const signer = await xhre.ethers.getSigner(deployer);
        const oracle = typechain_1.BPTPriceOracleV2__factory.connect(
            oracleDeployment.address,
            signer
        );
        const ETH_INDEX = 1;
        await oracle.setup(BEETHOVEN_VAULT, THE_E_MAJOR, [ETH_INDEX], [ETH_USD_FEED]);
        const price = await oracle.getPrice();
        const ethFeedAnswer = await typechain_1.AggregatorV3Interface__factory.connect(
            ETH_USD_FEED,
            signer
        ).latestRoundData();
        const ethUsd = ethFeedAnswer.answer;
        const ethBalance = await typechain_1.IVault__factory.connect(
            BEETHOVEN_VAULT,
            signer
        ).getPoolTokens(THE_E_MAJOR);
        const lpSupply = await typechain_1.IERC20__factory.connect(
            THE_E_MAJOR_ADDRESS,
            signer
        ).totalSupply();
        const ethValue = ethUsd.mul(ethBalance.balances[ETH_INDEX]);
        const poolValue = ethValue.mul(100).div(60);
        const bptPrice = poolValue.div(lpSupply);
        (0, chai_1.expect)(price).to.eq(bptPrice);
    });
    it("Should deploy BPTMNLT price oracle", async function () {
        await deployments.fixture([_25_deployBPTMNLTpriceOracle_1.BPTMNLT_ORACLE_DID]);
        const { contract: oracle } = await get("BPTMNLTPriceOracle");
        const price = await oracle.getPrice();
        const { BEETHOVEN_VAULT, THE_MONOLITH_POOLID, THE_MONOLITH_POOL, DAI_USD_FEED } =
            contracts_1.externalAddressRegistry.forNetwork(await getNetwork());
        const signer = await xhre.ethers.getSigner(deployer);
        const FTM_INDEX = 0;
        const MAI_INDEX = 4;
        await oracle.setup(
            BEETHOVEN_VAULT,
            THE_MONOLITH_POOLID,
            [FTM_INDEX, MAI_INDEX],
            [FTM_USD_FEED, DAI_USD_FEED]
        );
        const ftmFeedAnswer = await typechain_1.AggregatorV3Interface__factory.connect(
            FTM_USD_FEED,
            signer
        ).latestRoundData();
        const ftmUsd = ftmFeedAnswer.answer;
        const poolTokens = await typechain_1.IVault__factory.connect(
            BEETHOVEN_VAULT,
            signer
        ).getPoolTokens(THE_MONOLITH_POOLID);
        const lpSupply = await typechain_1.IERC20__factory.connect(
            THE_MONOLITH_POOL,
            signer
        ).totalSupply();
        const ftmValue = ftmUsd.mul(poolTokens.balances[FTM_INDEX]);
        const poolValue = ftmValue
            .add(poolTokens.balances[MAI_INDEX].mul(1e8))
            .mul(100)
            .div(40);
        const bptPrice = poolValue.div(lpSupply);
        (0, chai_1.expect)(price).to.be.closeTo(bptPrice, 1e7);
    });
    it("BPTMNLTPriceOracle should only let policy call setup", async function () {
        await deployments.fixture([_25_deployBPTMNLTpriceOracle_1.BPTMNLT_ORACLE_DID]);
        const { contract: oracle } = await get("BPTMNLTPriceOracle");
        const [account] = await xhre.getUnnamedAccounts();
        const signer = await xhre.ethers.getSigner(account);
        const contract = typechain_1.BPTPriceOracleV2__factory.connect(
            oracle.address,
            signer
        );
        const { BEETHOVEN_VAULT, THE_MONOLITH_POOLID, THE_MONOLITH_POOL } =
            contracts_1.externalAddressRegistry.forNetwork(await getNetwork());
        (0, chai_1.expect)(
            contract.setup(BEETHOVEN_VAULT, THE_MONOLITH_POOLID, [1], [FTM_USD_FEED])
        ).to.be.revertedWith("Ownable: caller is not the owner");
    });
});
