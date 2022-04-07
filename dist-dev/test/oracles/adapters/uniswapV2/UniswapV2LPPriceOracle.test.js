"use strict";
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              Object.defineProperty(o, k2, {
                  enumerable: true,
                  get: function () {
                      return m[k];
                  },
              });
          }
        : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              o[k2] = m[k];
          });
var __setModuleDefault =
    (this && this.__setModuleDefault) ||
    (Object.create
        ? function (o, v) {
              Object.defineProperty(o, "default", { enumerable: true, value: v });
          }
        : function (o, v) {
              o["default"] = v;
          });
var __importStar =
    (this && this.__importStar) ||
    function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
                    __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    };
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = __importStar(require("hardhat"));
const _38_deployExodiaRoles_1 = require("../../../../deploy/38_deployExodiaRoles");
const _43_deployChainlinkPriceOracle_1 = require("../../../../deploy/43_deployChainlinkPriceOracle");
const contracts_1 = require("../../../../packages/sdk/contracts");
const utils_1 = require("../../../../packages/utils/utils");
const typechain_1 = require("../../../../packages/sdk/typechain");
const xhre = hardhat_1.default;
const { deployments, get, getNetwork } = xhre;
const USDC = "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75";
const WBTC = "0x321162Cd933E2Be498Cd2267a90534A804051b11";
const BTC_USD_FEED = "0x8e94C22142F4A64b99022ccDd994f4e9EC86E4B4";
const FTM_BTC_LP = "0x279b2c897737a50405ed2091694f225d83f2d3ba";
const DAI_USDC_LP = "0x9606D683d03f012DDa296eF0ae9261207C4A5847";
describe("Uniswap V2 LP Price Oracle", function () {
    let addressRegistry;
    let owner, user, architect;
    let oracle, chainlinkPrice;
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
        const oracleDeployment = await get("UniswapV2LPPriceOracle");
        oracle = await oracleDeployment.contract;
        const rolesDeployment = await get("ExodiaRoles");
        roles = await rolesDeployment.contract;
        await roles.addArchitect(architect.address);
        const ChainlinkPriceOracle = await xhre.ethers.getContractFactory(
            "ChainlinkPriceOracle"
        );
        chainlinkPrice = await ChainlinkPriceOracle.deploy();
        await chainlinkPrice.initialize(roles.address, addressRegistry.FTM_USD_FEED);
        await chainlinkPrice
            .connect(architect)
            .setPriceFeed(addressRegistry.DAI, addressRegistry.DAI_USD_FEED);
        await chainlinkPrice.connect(architect).setPriceFeed(WBTC, BTC_USD_FEED);
        await chainlinkPrice
            .connect(architect)
            .setPriceFeed(USDC, addressRegistry.USDC_USD_FEED);
    });
    it("Can't initialize with zero addresses", async function () {
        await (0, chai_1.expect)(oracle.initialize(utils_1.ZERO_ADDRESS)).to.revertedWith(
            "roles cannot be null address"
        );
    });
    it("Should be able to initialize", async function () {
        await oracle.initialize(roles.address);
    });
    it("Can't initialize twice", async function () {
        await oracle.initialize(roles.address);
        await (0, chai_1.expect)(oracle.initialize(roles.address)).to.revertedWith(
            "Initializable: contract is already initialized"
        );
    });
    describe("After initialization", function () {
        beforeEach(async function () {
            await oracle.initialize(roles.address);
        });
        it("Only architect can set token price feed", async function () {
            await (0, chai_1.expect)(
                oracle.connect(user).setTokenOracle(FTM_BTC_LP, {
                    token0Oracle: chainlinkPrice.address,
                    token1Oracle: chainlinkPrice.address,
                })
            ).to.revertedWith("caller is not an architect");
        });
        it("Architect can set token price feed", async function () {
            await oracle.connect(architect).setTokenOracle(FTM_BTC_LP, {
                token0Oracle: chainlinkPrice.address,
                token1Oracle: chainlinkPrice.address,
            });
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
        describe("After token oracle setting: FTM-BTC", function () {
            beforeEach(async function () {
                await oracle.connect(architect).setTokenOracle(FTM_BTC_LP, {
                    token0Oracle: chainlinkPrice.address,
                    token1Oracle: chainlinkPrice.address,
                });
            });
            it("Should be able to get current price", async function () {
                const lpPrice = await oracle.getCurrentPrice(FTM_BTC_LP);
                const lpTotalSupply = await typechain_1.IERC20__factory.connect(
                    FTM_BTC_LP,
                    owner
                ).totalSupply();
                const token0Price = await chainlinkPrice.getCurrentPrice(WBTC);
                const token0Amount = (
                    await typechain_1.IERC20__factory.connect(WBTC, owner).balanceOf(
                        FTM_BTC_LP
                    )
                )
                    .mul(hardhat_1.ethers.utils.parseEther("1"))
                    .div(
                        hardhat_1.ethers.BigNumber.from("10").pow(
                            await typechain_1.IERC20__factory.connect(
                                WBTC,
                                owner
                            ).decimals()
                        )
                    ); // WBTC decimals 8
                const token1Price = hardhat_1.ethers.utils.parseEther("1");
                const token1Amount = await typechain_1.IERC20__factory.connect(
                    addressRegistry.WFTM,
                    owner
                ).balanceOf(FTM_BTC_LP);
                (0, chai_1.expect)(lpPrice.mul(lpTotalSupply)).to.be.closeTo(
                    token0Price.mul(token0Amount).add(token1Price.mul(token1Amount)),
                    lpPrice.mul(lpTotalSupply).div(10000)
                ); // 0.01% diff
            });
            it("Should be able to get safe price", async function () {
                const lpPrice = await oracle.getSafePrice(FTM_BTC_LP);
                const lpTotalSupply = await typechain_1.IERC20__factory.connect(
                    FTM_BTC_LP,
                    owner
                ).totalSupply();
                const token0Price = await chainlinkPrice.getSafePrice(WBTC);
                const token0Amount = (
                    await typechain_1.IERC20__factory.connect(WBTC, owner).balanceOf(
                        FTM_BTC_LP
                    )
                )
                    .mul(hardhat_1.ethers.utils.parseEther("1"))
                    .div(
                        hardhat_1.ethers.BigNumber.from("10").pow(
                            await typechain_1.IERC20__factory.connect(
                                WBTC,
                                owner
                            ).decimals()
                        )
                    ); // WBTC decimals 8
                const token1Price = hardhat_1.ethers.utils.parseEther("1");
                const token1Amount = await typechain_1.IERC20__factory.connect(
                    addressRegistry.WFTM,
                    owner
                ).balanceOf(FTM_BTC_LP);
                (0, chai_1.expect)(lpPrice.mul(lpTotalSupply)).to.be.closeTo(
                    token0Price.mul(token0Amount).add(token1Price.mul(token1Amount)),
                    lpPrice.mul(lpTotalSupply).div(10000)
                ); // 0.01% diff
            });
            it("Should be able to update safe price", async function () {
                await oracle.updateSafePrice(FTM_BTC_LP);
            });
        });
        describe("After token oracle setting: DAI-USDC", function () {
            beforeEach(async function () {
                await oracle.connect(architect).setTokenOracle(DAI_USDC_LP, {
                    token0Oracle: chainlinkPrice.address,
                    token1Oracle: chainlinkPrice.address,
                });
            });
            it("Should be able to get current price", async function () {
                const lpPrice = await oracle.getCurrentPrice(DAI_USDC_LP);
                const lpTotalSupply = await typechain_1.IERC20__factory.connect(
                    DAI_USDC_LP,
                    owner
                ).totalSupply();
                const token0Price = await chainlinkPrice.getCurrentPrice(
                    addressRegistry.DAI
                );
                const token0Amount = await typechain_1.IERC20__factory.connect(
                    addressRegistry.DAI,
                    owner
                ).balanceOf(DAI_USDC_LP); // DAI decimals 18
                const token1Price = await chainlinkPrice.getCurrentPrice(USDC);
                const token1Amount = (
                    await typechain_1.IERC20__factory.connect(USDC, owner).balanceOf(
                        DAI_USDC_LP
                    )
                )
                    .mul(hardhat_1.ethers.utils.parseEther("1"))
                    .div(
                        hardhat_1.ethers.BigNumber.from("10").pow(
                            await typechain_1.IERC20__factory.connect(
                                USDC,
                                owner
                            ).decimals()
                        )
                    ); // USDC decimals 6
                (0, chai_1.expect)(lpPrice.mul(lpTotalSupply)).to.be.closeTo(
                    token0Price.mul(token0Amount).add(token1Price.mul(token1Amount)),
                    lpPrice.mul(lpTotalSupply).div(10000)
                ); // 0.01% diff
            });
            it("Should be able to get safe price", async function () {
                const lpPrice = await oracle.getSafePrice(DAI_USDC_LP);
                const lpTotalSupply = await typechain_1.IERC20__factory.connect(
                    DAI_USDC_LP,
                    owner
                ).totalSupply();
                const token0Price = await chainlinkPrice.getSafePrice(
                    addressRegistry.DAI
                );
                const token0Amount = await typechain_1.IERC20__factory.connect(
                    addressRegistry.DAI,
                    owner
                ).balanceOf(DAI_USDC_LP); // DAI decimals 18
                const token1Price = await chainlinkPrice.getSafePrice(USDC);
                const token1Amount = (
                    await typechain_1.IERC20__factory.connect(USDC, owner).balanceOf(
                        DAI_USDC_LP
                    )
                )
                    .mul(hardhat_1.ethers.utils.parseEther("1"))
                    .div(
                        hardhat_1.ethers.BigNumber.from("10").pow(
                            await typechain_1.IERC20__factory.connect(
                                USDC,
                                owner
                            ).decimals()
                        )
                    ); // USDC decimals 6
                (0, chai_1.expect)(lpPrice.mul(lpTotalSupply)).to.be.closeTo(
                    token0Price.mul(token0Amount).add(token1Price.mul(token1Amount)),
                    lpPrice.mul(lpTotalSupply).div(10000)
                ); // 0.01% diff
            });
            it("Should be able to update safe price", async function () {
                await oracle.updateSafePrice(DAI_USDC_LP);
            });
        });
    });
});
