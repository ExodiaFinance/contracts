"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const chai_1 = require("chai");
const hardhat_1 = __importDefault(require("hardhat"));
const _38_deployExodiaRoles_1 = require("../../../../deploy/38_deployExodiaRoles");
const _43_deployChainlinkPriceOracle_1 = require("../../../../deploy/43_deployChainlinkPriceOracle");
const contracts_1 = require("../../../../packages/sdk/contracts");
const utils_1 = require("../../../../packages/utils/utils");
const xhre = hardhat_1.default;
const { deployments, get, getNetwork } = xhre;
const WBTC = "0x321162Cd933E2Be498Cd2267a90534A804051b11";
const BTC_USD_FEED = "0x8e94C22142F4A64b99022ccDd994f4e9EC86E4B4";
describe("Chainlink Price Oracle", function () {
    let addressRegistry;
    let owner, user, architect;
    let oracle;
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
            _43_deployChainlinkPriceOracle_1.CHAINLINK_PRICE_ORACLE_DID,
        ]);
        const oracleDeployment = await get("ChainlinkPriceOracle");
        oracle = await oracleDeployment.contract;
        const rolesDeployment = await get("ExodiaRoles");
        roles = await rolesDeployment.contract;
        await roles.addArchitect(architect.address);
    });
    it("Can't initialize with zero addresses", async function () {
        await (0, chai_1.expect)(
            oracle.initialize(utils_1.ZERO_ADDRESS, addressRegistry.FTM_USD_FEED)
        ).to.revertedWith("roles cannot be null address");
        await (0, chai_1.expect)(
            oracle.initialize(roles.address, utils_1.ZERO_ADDRESS)
        ).to.revertedWith("FTM PRICE FEED cannot be the null address");
    });
    it("Should be able to initialize", async function () {
        await oracle.initialize(roles.address, addressRegistry.FTM_USD_FEED);
    });
    it("Can't initialize twice", async function () {
        await oracle.initialize(roles.address, addressRegistry.FTM_USD_FEED);
        await (0, chai_1.expect)(
            oracle.initialize(roles.address, addressRegistry.FTM_USD_FEED)
        ).to.revertedWith("Initializable: contract is already initialized");
    });
    describe("After initialization", function () {
        beforeEach(async function () {
            await oracle.initialize(roles.address, addressRegistry.FTM_USD_FEED);
        });
        it("Only architect can set token price feed", async function () {
            await (0, chai_1.expect)(
                oracle
                    .connect(user)
                    .setPriceFeed(addressRegistry.DAI, addressRegistry.DAI_USD_FEED)
            ).to.revertedWith("caller is not an architect");
        });
        it("Architect can set token price feed", async function () {
            await oracle
                .connect(architect)
                .setPriceFeed(addressRegistry.DAI, addressRegistry.DAI_USD_FEED);
            (0, chai_1.expect)(await oracle.priceFeed(addressRegistry.DAI)).to.equal(
                addressRegistry.DAI_USD_FEED
            );
        });
        it("Can't get price for unsupported", async function () {
            await (0, chai_1.expect)(
                oracle.getCurrentPrice(addressRegistry.BEETS)
            ).to.revertedWith("UNSUPPORTED");
            await (0, chai_1.expect)(
                oracle.getSafePrice(addressRegistry.BEETS)
            ).to.revertedWith("UNSUPPORTED");
            await (0, chai_1.expect)(
                oracle.updateSafePrice(addressRegistry.BEETS)
            ).to.revertedWith("UNSUPPORTED");
        });
        describe("After token oracle setting: DAI-FTM", function () {
            beforeEach(async function () {
                await oracle
                    .connect(architect)
                    .setPriceFeed(addressRegistry.DAI, addressRegistry.DAI_USD_FEED);
            });
            it("Should be able to get current price", async function () {
                const price = await oracle.getCurrentPrice(addressRegistry.DAI);
                const priceFromCoingecko = xhre.ethers.utils
                    .parseUnits(
                        (
                            await getTokenPriceFromCoingecko(addressRegistry.DAI)
                        ).toString(),
                        18
                    )
                    .mul(xhre.ethers.utils.parseUnits("1", 18))
                    .div(
                        xhre.ethers.utils.parseUnits(
                            (
                                await getTokenPriceFromCoingecko(addressRegistry.WFTM)
                            ).toString(),
                            18
                        )
                    );
                console.log("current price from oracle = ", price.toString());
                console.log("price from coingecko = ", priceFromCoingecko.toString());
                (0, chai_1.expect)(price).to.be.closeTo(
                    priceFromCoingecko,
                    price.mul(2).div(100)
                ); // 2% diff
            });
            it("Should be able to get safe price", async function () {
                const price = await oracle.getSafePrice(addressRegistry.DAI);
                const priceFromCoingecko = xhre.ethers.utils
                    .parseUnits(
                        (
                            await getTokenPriceFromCoingecko(addressRegistry.DAI)
                        ).toString(),
                        18
                    )
                    .mul(xhre.ethers.utils.parseUnits("1", 18))
                    .div(
                        xhre.ethers.utils.parseUnits(
                            (
                                await getTokenPriceFromCoingecko(addressRegistry.WFTM)
                            ).toString(),
                            18
                        )
                    );
                console.log("safe price from oracle = ", price.toString());
                console.log("price from coingecko = ", priceFromCoingecko.toString());
                (0, chai_1.expect)(price).to.be.closeTo(
                    priceFromCoingecko,
                    price.mul(2).div(100)
                ); // 2% diff
            });
            it("Should be able to update safe price", async function () {
                await oracle.updateSafePrice(addressRegistry.DAI);
            });
        });
        describe("After token oracle setting: WBTC-FTM", function () {
            beforeEach(async function () {
                await oracle.connect(architect).setPriceFeed(WBTC, BTC_USD_FEED);
            });
            it("Should be able to get current price", async function () {
                const price = await oracle.getCurrentPrice(WBTC);
                const priceFromCoingecko = xhre.ethers.utils
                    .parseUnits((await getTokenPriceFromCoingecko(WBTC)).toString(), 18)
                    .mul(xhre.ethers.utils.parseUnits("1", 18))
                    .div(
                        xhre.ethers.utils.parseUnits(
                            (
                                await getTokenPriceFromCoingecko(addressRegistry.WFTM)
                            ).toString(),
                            18
                        )
                    );
                console.log("current price from oracle = ", price.toString());
                console.log("price from coingecko = ", priceFromCoingecko.toString());
                (0, chai_1.expect)(price).to.be.closeTo(
                    priceFromCoingecko,
                    price.mul(2).div(100)
                ); // 2% diff
            });
            it("Should be able to get safe price", async function () {
                const price = await oracle.getSafePrice(WBTC);
                const priceFromCoingecko = xhre.ethers.utils
                    .parseUnits((await getTokenPriceFromCoingecko(WBTC)).toString(), 18)
                    .mul(xhre.ethers.utils.parseUnits("1", 18))
                    .div(
                        xhre.ethers.utils.parseUnits(
                            (
                                await getTokenPriceFromCoingecko(addressRegistry.WFTM)
                            ).toString(),
                            18
                        )
                    );
                console.log("safe price from oracle = ", price.toString());
                console.log("price from coingecko = ", priceFromCoingecko.toString());
                (0, chai_1.expect)(price).to.be.closeTo(
                    priceFromCoingecko,
                    price.mul(2).div(100)
                ); // 2% diff
            });
            it("Should be able to update safe price", async function () {
                await oracle.updateSafePrice(WBTC);
            });
        });
    });
});
const getTokenPriceFromCoingecko = async function (tokenAddr) {
    const apiUrl = `https://api.coingecko.com/api/v3/simple/token_price/fantom?contract_addresses=${tokenAddr}&vs_currencies=usd`;
    const response = await axios_1.default.get(apiUrl);
    return response.data[tokenAddr.toLocaleLowerCase()].usd;
};
