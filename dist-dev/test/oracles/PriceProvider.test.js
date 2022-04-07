"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = __importDefault(require("hardhat"));
const chai_1 = require("chai");
const _38_deployExodiaRoles_1 = require("../../deploy/38_deployExodiaRoles");
const _42_deployBalancerV2PriceOracle_1 = require("../../deploy/42_deployBalancerV2PriceOracle");
const _44_deployPriceProvider_1 = require("../../deploy/44_deployPriceProvider");
const contracts_1 = require("../../packages/sdk/contracts");
const utils_1 = require("../../packages/utils/utils");
const xhre = hardhat_1.default;
const { deployments, get, getNetwork } = xhre;
const MINIMUM_UPDATE_INTERVAL = 60 * 5; // 5 mins
const WSSCR = "0xA7727db8DB5afcA6d88eb7FB9E8e322dc043325a";
const WSSCR_DAI_POOL = "0x43d668c6F709C9D7f05C9404707A10d968B0348c";
describe("PriceProvider", function () {
    let addressRegistry;
    let owner, user, architect;
    let balancerOracle, chainlinkOracle, priceProvider;
    let roles;
    before(async function () {
        [owner, user, architect] = await xhre.ethers.getSigners();
        addressRegistry = contracts_1.externalAddressRegistry.forNetwork(
            await getNetwork()
        );
    });
    beforeEach(async function () {
        await deployments.fixture([
            _38_deployExodiaRoles_1.EXODIA_ROLES_DID,
            _44_deployPriceProvider_1.PRICE_PROVIDER_DID,
            _42_deployBalancerV2PriceOracle_1.BALANCER_V2_PRICE_ORACLE_DID,
        ]);
        const oracleDeployment = await get("BalancerV2PriceOracle");
        balancerOracle = await oracleDeployment.contract;
        const priceProviderDeployment = await get("PriceProvider");
        priceProvider = await priceProviderDeployment.contract;
        const rolesDeployment = await get("ExodiaRoles");
        roles = await rolesDeployment.contract;
        await roles.addArchitect(architect.address);
        const ChainlinkPriceOracle = await xhre.ethers.getContractFactory(
            "ChainlinkPriceOracle"
        );
        chainlinkOracle = await ChainlinkPriceOracle.deploy();
        await chainlinkOracle.initialize(roles.address, addressRegistry.FTM_USD_FEED);
        // chainlink: DAI/FTM
        await chainlinkOracle
            .connect(architect)
            .setPriceFeed(addressRegistry.DAI, addressRegistry.DAI_USD_FEED);
        await balancerOracle.initialize(
            roles.address,
            addressRegistry.BEETHOVEN_VAULT,
            MINIMUM_UPDATE_INTERVAL
        );
        // balancer: BEETS/FTM
        await balancerOracle
            .connect(architect)
            .setTokenOracle(
                addressRegistry.BEETS,
                addressRegistry.FIDELIO_DUETTO,
                utils_1.ZERO_ADDRESS
            );
        // balancer: WSSCR/FTM
        await balancerOracle
            .connect(architect)
            .setTokenOracle(WSSCR, WSSCR_DAI_POOL, chainlinkOracle.address);
    });
    it("Can't initialize with zero addresses", async function () {
        await (0, chai_1.expect)(
            priceProvider.initialize(utils_1.ZERO_ADDRESS)
        ).to.revertedWith("roles cannot be null address");
    });
    it("Should be able to initialize", async function () {
        await priceProvider.initialize(roles.address);
    });
    it("Can't initialize twice", async function () {
        await priceProvider.initialize(roles.address);
        await (0, chai_1.expect)(
            priceProvider.initialize(utils_1.ZERO_ADDRESS)
        ).to.revertedWith("Initializable: contract is already initialized");
    });
    describe("After initialization", function () {
        beforeEach(async function () {
            await priceProvider.initialize(roles.address);
        });
        it("Only architect can set token oracle settings", async function () {
            await (0, chai_1.expect)(
                priceProvider
                    .connect(user)
                    .setTokenOracle(addressRegistry.BEETS, balancerOracle.address)
            ).to.revertedWith("caller is not an architect");
        });
        describe("After token oracle setting: BEETS-FTM", function () {
            beforeEach(async function () {
                await priceProvider
                    .connect(architect)
                    .setTokenOracle(addressRegistry.BEETS, balancerOracle.address);
            });
            it("Should be able to get current price", async function () {
                (0, chai_1.expect)(
                    await priceProvider.getCurrentPrice(addressRegistry.BEETS)
                ).to.equal(await balancerOracle.getCurrentPrice(addressRegistry.BEETS));
            });
            it("Should be able to get safe price", async function () {
                (0, chai_1.expect)(
                    await priceProvider.getSafePrice(addressRegistry.BEETS)
                ).to.equal(await balancerOracle.getSafePrice(addressRegistry.BEETS));
            });
            it("Should be able to update safe price", async function () {
                await priceProvider.updateSafePrice(addressRegistry.BEETS);
            });
        });
        describe("After token oracle setting: wsSCR-FTM", function () {
            beforeEach(async function () {
                await priceProvider
                    .connect(architect)
                    .setTokenOracle(WSSCR, balancerOracle.address);
            });
            it("Should be able to get current price", async function () {
                (0, chai_1.expect)(await priceProvider.getCurrentPrice(WSSCR)).to.equal(
                    await balancerOracle.getCurrentPrice(WSSCR)
                );
            });
            it("Should be able to get safe price", async function () {
                (0, chai_1.expect)(await priceProvider.getSafePrice(WSSCR)).to.equal(
                    await balancerOracle.getSafePrice(WSSCR)
                );
            });
            it("Should be able to update safe price", async function () {
                await priceProvider.updateSafePrice(WSSCR);
            });
        });
        describe("After token oracle setting: DAI-FTM", function () {
            beforeEach(async function () {
                await priceProvider
                    .connect(architect)
                    .setTokenOracle(addressRegistry.DAI, chainlinkOracle.address);
            });
            it("Should be able to get current price", async function () {
                (0, chai_1.expect)(
                    await priceProvider.getCurrentPrice(addressRegistry.DAI)
                ).to.equal(await chainlinkOracle.getCurrentPrice(addressRegistry.DAI));
            });
            it("Should be able to get safe price", async function () {
                (0, chai_1.expect)(
                    await priceProvider.getSafePrice(addressRegistry.DAI)
                ).to.equal(await chainlinkOracle.getSafePrice(addressRegistry.DAI));
            });
            it("Should be able to update safe price", async function () {
                await priceProvider.updateSafePrice(addressRegistry.DAI);
            });
        });
    });
});
