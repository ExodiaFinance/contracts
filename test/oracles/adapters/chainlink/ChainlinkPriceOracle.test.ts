import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import axios from "axios";
import { expect } from "chai";
import hre from "hardhat";

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
    ChainlinkPriceOracle__factory,
    ExodiaRoles,
    ExodiaRoles__factory,
} from "../../../../packages/sdk/typechain";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNetwork } = xhre;

const WBTC = "0x321162Cd933E2Be498Cd2267a90534A804051b11";
const BTC_USD_FEED = "0x8e94C22142F4A64b99022ccDd994f4e9EC86E4B4";

describe("Chainlink Price Oracle", function () {
    let addressRegistry: IExternalContractsRegistry;
    let owner: SignerWithAddress, user: SignerWithAddress, architect: SignerWithAddress;
    let oracle: ChainlinkPriceOracle;
    let roles: ExodiaRoles;

    before(async function () {
        [owner, user, architect] = await xhre.ethers.getSigners();
        addressRegistry = externalAddressRegistry.forNetwork(await getNetwork());
    });

    beforeEach(async function () {
        await deployments.fixture([EXODIA_ROLES_DID, CHAINLINK_PRICE_ORACLE_DID]);
        const oracleDeployment = await get<ChainlinkPriceOracle__factory>(
            "ChainlinkPriceOracle"
        );
        oracle = await oracleDeployment.contract;
        const rolesDeployment = await get<ExodiaRoles__factory>("ExodiaRoles");
        roles = await rolesDeployment.contract;

        await roles.addArchitect(architect.address);
    });

    it("Can't initialize with zero addresses", async function () {
        await expect(
            oracle.initialize(ZERO_ADDRESS, addressRegistry.FTM_USD_FEED)
        ).to.revertedWith("roles cannot be null address");
        await expect(oracle.initialize(roles.address, ZERO_ADDRESS)).to.revertedWith(
            "FTM PRICE FEED cannot be the null address"
        );
    });

    it("Should be able to initialize", async function () {
        await oracle.initialize(roles.address, addressRegistry.FTM_USD_FEED);
    });

    it("Can't initialize twice", async function () {
        await oracle.initialize(roles.address, addressRegistry.FTM_USD_FEED);

        await expect(
            oracle.initialize(roles.address, addressRegistry.FTM_USD_FEED)
        ).to.revertedWith("Initializable: contract is already initialized");
    });

    describe("After initialization", function () {
        beforeEach(async function () {
            await oracle.initialize(roles.address, addressRegistry.FTM_USD_FEED);
        });

        it("Only architect can set token price feed", async function () {
            await expect(
                oracle
                    .connect(user)
                    .setPriceFeed(addressRegistry.DAI, addressRegistry.DAI_USD_FEED)
            ).to.revertedWith("caller is not an architect");
        });

        it("Architect can set token price feed", async function () {
            await oracle
                .connect(architect)
                .setPriceFeed(addressRegistry.DAI, addressRegistry.DAI_USD_FEED);

            expect(await oracle.priceFeed(addressRegistry.DAI)).to.equal(
                addressRegistry.DAI_USD_FEED
            );
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
                expect(price).to.be.closeTo(
                    priceFromCoingecko,
                    price.mul(2).div(100) as any
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
                expect(price).to.be.closeTo(
                    priceFromCoingecko,
                    price.mul(2).div(100) as any
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
                expect(price).to.be.closeTo(
                    priceFromCoingecko,
                    price.mul(2).div(100) as any
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
                expect(price).to.be.closeTo(
                    priceFromCoingecko,
                    price.mul(2).div(100) as any
                ); // 2% diff
            });

            it("Should be able to update safe price", async function () {
                await oracle.updateSafePrice(WBTC);
            });
        });
    });
});

const getTokenPriceFromCoingecko = async function (tokenAddr: string) {
    const apiUrl = `https://api.coingecko.com/api/v3/simple/token_price/fantom?contract_addresses=${tokenAddr}&vs_currencies=usd`;
    const response = await axios.get(apiUrl);
    return response.data[tokenAddr.toLocaleLowerCase()].usd;
};
