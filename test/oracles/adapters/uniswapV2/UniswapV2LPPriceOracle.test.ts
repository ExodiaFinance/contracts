import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import axios from "axios";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

import { EXODIA_ROLES_DID } from "../../../../deploy/38_deployExodiaRoles";
import { CHAINLINK_PRICE_ORACLE_DID } from "../../../../deploy/43_deployChainlinkPriceOracle";
import { externalAddressRegistry } from "../../../../packages/sdk/contracts";
import {
    IExodiaContractsRegistry,
    IExternalContractsRegistry,
} from "../../../../packages/sdk/contracts/exodiaContracts";
import { IExtendedHRE } from "../../../../packages/HardhatRegistryExtension/ExtendedHRE";
import { ZERO_ADDRESS } from "../../../../packages/utils/utils";
import {
    ChainlinkPriceOracle,
    ExodiaRoles,
    ExodiaRoles__factory,
    IERC20,
    IERC20__factory,
    UniswapV2LPPriceOracle,
    UniswapV2LPPriceOracle__factory,
} from "../../../../packages/sdk/typechain";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNetwork } = xhre;

const USDC = "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75";
const WBTC = "0x321162Cd933E2Be498Cd2267a90534A804051b11";
const BTC_USD_FEED = "0x8e94C22142F4A64b99022ccDd994f4e9EC86E4B4";
const FTM_BTC_LP = "0x279b2c897737a50405ed2091694f225d83f2d3ba";
const DAI_USDC_LP = "0x9606D683d03f012DDa296eF0ae9261207C4A5847";

describe("Uniswap V2 LP Price Oracle", function () {
    let addressRegistry: IExternalContractsRegistry;
    let owner: SignerWithAddress, user: SignerWithAddress, architect: SignerWithAddress;
    let oracle: UniswapV2LPPriceOracle, chainlinkPrice: ChainlinkPriceOracle;
    let roles: ExodiaRoles;

    before(async function () {
        [owner, user, architect] = await xhre.ethers.getSigners();
        addressRegistry = externalAddressRegistry.forNetwork(await getNetwork());
    });

    beforeEach(async function () {
        await deployments.fixture([EXODIA_ROLES_DID, CHAINLINK_PRICE_ORACLE_DID]);
        const oracleDeployment = await get<UniswapV2LPPriceOracle__factory>(
            "UniswapV2LPPriceOracle"
        );
        oracle = await oracleDeployment.contract;
        const rolesDeployment = await get<ExodiaRoles__factory>("ExodiaRoles");
        roles = await rolesDeployment.contract;

        await roles.addArchitect(architect.address);

        const ChainlinkPriceOracle = await xhre.ethers.getContractFactory(
            "ChainlinkPriceOracle"
        );
        chainlinkPrice = <ChainlinkPriceOracle>await ChainlinkPriceOracle.deploy();
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
        await expect(oracle.initialize(ZERO_ADDRESS)).to.revertedWith(
            "roles cannot be null address"
        );
    });

    it("Should be able to initialize", async function () {
        await oracle.initialize(roles.address);
    });

    it("Can't initialize twice", async function () {
        await oracle.initialize(roles.address);

        await expect(oracle.initialize(roles.address)).to.revertedWith(
            "Initializable: contract is already initialized"
        );
    });

    describe("After initialization", function () {
        beforeEach(async function () {
            await oracle.initialize(roles.address);
        });

        it("Only architect can set token price feed", async function () {
            await expect(
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
            await expect(oracle.getCurrentPrice(addressRegistry.BEETS)).to.revertedWith(
                "UNSUPPORTED"
            );
            await expect(oracle.getSafePrice(addressRegistry.BEETS)).to.revertedWith(
                "UNSUPPORTED"
            );
            await expect(oracle.updateSafePrice(addressRegistry.BEETS)).to.revertedWith(
                "UNSUPPORTED"
            );
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
                const lpTotalSupply = await IERC20__factory.connect(
                    FTM_BTC_LP,
                    owner
                ).totalSupply();

                const token0Price = await chainlinkPrice.getCurrentPrice(WBTC);
                const token0Amount = (
                    await IERC20__factory.connect(WBTC, owner).balanceOf(FTM_BTC_LP)
                )
                    .mul(ethers.utils.parseEther("1"))
                    .div(
                        ethers.BigNumber.from("10").pow(
                            await IERC20__factory.connect(WBTC, owner).decimals()
                        )
                    ); // WBTC decimals 8

                const token1Price = ethers.utils.parseEther("1");
                const token1Amount = await IERC20__factory.connect(
                    addressRegistry.WFTM,
                    owner
                ).balanceOf(FTM_BTC_LP);

                expect(lpPrice.mul(lpTotalSupply)).to.be.closeTo(
                    token0Price.mul(token0Amount).add(token1Price.mul(token1Amount)),
                    lpPrice.mul(lpTotalSupply).div(10000) as any
                ); // 0.01% diff
            });

            it("Should be able to get safe price", async function () {
                const lpPrice = await oracle.getSafePrice(FTM_BTC_LP);
                const lpTotalSupply = await IERC20__factory.connect(
                    FTM_BTC_LP,
                    owner
                ).totalSupply();

                const token0Price = await chainlinkPrice.getSafePrice(WBTC);
                const token0Amount = (
                    await IERC20__factory.connect(WBTC, owner).balanceOf(FTM_BTC_LP)
                )
                    .mul(ethers.utils.parseEther("1"))
                    .div(
                        ethers.BigNumber.from("10").pow(
                            await IERC20__factory.connect(WBTC, owner).decimals()
                        )
                    ); // WBTC decimals 8

                const token1Price = ethers.utils.parseEther("1");
                const token1Amount = await IERC20__factory.connect(
                    addressRegistry.WFTM,
                    owner
                ).balanceOf(FTM_BTC_LP);

                expect(lpPrice.mul(lpTotalSupply)).to.be.closeTo(
                    token0Price.mul(token0Amount).add(token1Price.mul(token1Amount)),
                    lpPrice.mul(lpTotalSupply).div(10000) as any
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
                const lpTotalSupply = await IERC20__factory.connect(
                    DAI_USDC_LP,
                    owner
                ).totalSupply();

                const token0Price = await chainlinkPrice.getCurrentPrice(
                    addressRegistry.DAI
                );
                const token0Amount = await IERC20__factory.connect(
                    addressRegistry.DAI,
                    owner
                ).balanceOf(DAI_USDC_LP); // DAI decimals 18

                const token1Price = await chainlinkPrice.getCurrentPrice(USDC);
                const token1Amount = (
                    await IERC20__factory.connect(USDC, owner).balanceOf(DAI_USDC_LP)
                )
                    .mul(ethers.utils.parseEther("1"))
                    .div(
                        ethers.BigNumber.from("10").pow(
                            await IERC20__factory.connect(USDC, owner).decimals()
                        )
                    ); // USDC decimals 6

                expect(lpPrice.mul(lpTotalSupply)).to.be.closeTo(
                    token0Price.mul(token0Amount).add(token1Price.mul(token1Amount)),
                    lpPrice.mul(lpTotalSupply).div(10000) as any
                ); // 0.01% diff
            });

            it("Should be able to get safe price", async function () {
                const lpPrice = await oracle.getSafePrice(DAI_USDC_LP);
                const lpTotalSupply = await IERC20__factory.connect(
                    DAI_USDC_LP,
                    owner
                ).totalSupply();

                const token0Price = await chainlinkPrice.getSafePrice(
                    addressRegistry.DAI
                );
                const token0Amount = await IERC20__factory.connect(
                    addressRegistry.DAI,
                    owner
                ).balanceOf(DAI_USDC_LP); // DAI decimals 18

                const token1Price = await chainlinkPrice.getSafePrice(USDC);
                const token1Amount = (
                    await IERC20__factory.connect(USDC, owner).balanceOf(DAI_USDC_LP)
                )
                    .mul(ethers.utils.parseEther("1"))
                    .div(
                        ethers.BigNumber.from("10").pow(
                            await IERC20__factory.connect(USDC, owner).decimals()
                        )
                    ); // USDC decimals 6

                expect(lpPrice.mul(lpTotalSupply)).to.be.closeTo(
                    token0Price.mul(token0Amount).add(token1Price.mul(token1Amount)),
                    lpPrice.mul(lpTotalSupply).div(10000) as any
                ); // 0.01% diff
            });

            it("Should be able to update safe price", async function () {
                await oracle.updateSafePrice(DAI_USDC_LP);
            });
        });
    });
});
