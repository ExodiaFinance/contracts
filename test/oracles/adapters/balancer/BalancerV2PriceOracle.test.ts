import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import hre from "hardhat";
import axios from "axios";

import { EXODIA_ROLES_DID } from "../../../../deploy/38_deployExodiaRoles";
import { BALANCER_V2_PRICE_ORACLE_DID } from "../../../../deploy/41_deployBalancerV2PriceOracle";
import {
    IExodiaContractsRegistry,
    IExternalContractsRegistry,
} from "../../../../src/contracts/exodiaContracts";
import { externalAddressRegistry } from "../../../../src/contracts";
import { IExtendedHRE } from "../../../../src/HardhatRegistryExtension/ExtendedHRE";
import { ZERO_ADDRESS } from "../../../../src/utils";
import {
    BalancerV2PriceOracle,
    BalancerV2PriceOracle__factory,
    ExodiaRoles,
    ExodiaRoles__factory,
} from "../../../../typechain";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNetwork } = xhre;

const WBTC = "0x321162Cd933E2Be498Cd2267a90534A804051b11";
const MINIMUM_UPDATE_INTERVAL = 60 * 5; // 5 mins
const USDC_WFTM_BTC_ETH_POOL = "0xf3A602d30dcB723A74a0198313a7551FEacA7DAc";

describe("Balancer V2 Price Oracle", function () {
    let addressRegistry: IExternalContractsRegistry;
    let owner: SignerWithAddress, user: SignerWithAddress, architect: SignerWithAddress;
    let oracle: BalancerV2PriceOracle;
    let roles: ExodiaRoles;

    before(async function () {
        [owner, user, architect] = await xhre.ethers.getSigners();
        addressRegistry = externalAddressRegistry.forNetwork(await getNetwork());
    });

    beforeEach(async function () {
        await deployments.fixture([EXODIA_ROLES_DID, BALANCER_V2_PRICE_ORACLE_DID]);
        const oracleDeployment = await get<BalancerV2PriceOracle__factory>(
            "BalancerV2PriceOracle"
        );
        oracle = await oracleDeployment.contract;
        const rolesDeployment = await get<ExodiaRoles__factory>("ExodiaRoles");
        roles = await rolesDeployment.contract;

        await roles.addArchitect(architect.address);
    });

    it("Can't initialize with zero addresses", async function () {
        await expect(
            oracle.initialize(
                ZERO_ADDRESS,
                addressRegistry.BEETHOVEN_VAULT,
                MINIMUM_UPDATE_INTERVAL
            )
        ).to.revertedWith("roles cannot be null address");
        await expect(
            oracle.initialize(roles.address, ZERO_ADDRESS, MINIMUM_UPDATE_INTERVAL)
        ).to.revertedWith("vault cannot be null address");
    });

    it("Should be able to initialize", async function () {
        await oracle.initialize(
            roles.address,
            addressRegistry.BEETHOVEN_VAULT,
            MINIMUM_UPDATE_INTERVAL
        );

        expect(await oracle.vault()).to.equal(addressRegistry.BEETHOVEN_VAULT);
    });

    it("Can't initialize twice", async function () {
        await oracle.initialize(
            roles.address,
            addressRegistry.BEETHOVEN_VAULT,
            MINIMUM_UPDATE_INTERVAL
        );

        await expect(
            oracle.initialize(
                ZERO_ADDRESS,
                addressRegistry.BEETHOVEN_VAULT,
                MINIMUM_UPDATE_INTERVAL
            )
        ).to.revertedWith("Initializable: contract is already initialized");
    });

    describe("After initialization", function () {
        beforeEach(async function () {
            await oracle.initialize(
                roles.address,
                addressRegistry.BEETHOVEN_VAULT,
                MINIMUM_UPDATE_INTERVAL
            );
        });

        it("Only architect can set token oracle settings", async function () {
            await expect(
                oracle
                    .connect(user)
                    .setTokenOracle(
                        addressRegistry.BEETS,
                        addressRegistry.FIDELIO_DUETTO,
                        addressRegistry.FTM_USD_FEED
                    )
            ).to.revertedWith("caller is not an architect");
        });

        it("Only support 2-token pools", async function () {
            await expect(
                oracle
                    .connect(architect)
                    .setTokenOracle(
                        addressRegistry.BEETS,
                        USDC_WFTM_BTC_ETH_POOL,
                        addressRegistry.FTM_USD_FEED
                    )
            ).to.revertedWith("INVALID POOL");
        });

        it("Check if token matches to the pool", async function () {
            await expect(
                oracle
                    .connect(architect)
                    .setTokenOracle(
                        WBTC,
                        addressRegistry.FIDELIO_DUETTO,
                        addressRegistry.FTM_USD_FEED
                    )
            ).to.revertedWith("INVALID TOKENS");
        });

        it("Architect can set oracle settings", async function () {
            await oracle
                .connect(architect)
                .setTokenOracle(
                    addressRegistry.BEETS,
                    addressRegistry.FIDELIO_DUETTO,
                    addressRegistry.FTM_USD_FEED
                );

            expect(await oracle.tokenPools(addressRegistry.BEETS)).to.equal(
                addressRegistry.FIDELIO_DUETTO
            );
            expect(await oracle.denominatedOracles(addressRegistry.BEETS)).to.equal(
                addressRegistry.FTM_USD_FEED
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

        describe("After token oracle setting", function () {
            beforeEach(async function () {
                await oracle
                    .connect(architect)
                    .setTokenOracle(
                        addressRegistry.BEETS,
                        addressRegistry.FIDELIO_DUETTO,
                        addressRegistry.FTM_USD_FEED
                    );
            });

            it("Should be able to get current price", async function () {
                const price = await oracle.getCurrentPrice(addressRegistry.BEETS);
                const priceFromCoingecko = xhre.ethers.utils.parseUnits(
                    (await getTokenPriceFromCoingecko(addressRegistry.BEETS)).toString(),
                    18
                ).mul(xhre.ethers.utils.parseUnits("1", 18)).div(
                    xhre.ethers.utils.parseUnits(
                        (await getTokenPriceFromCoingecko(addressRegistry.WFTM)).toString(),
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
                const price = await oracle.getSafePrice(addressRegistry.BEETS);
                const priceFromCoingecko = xhre.ethers.utils.parseUnits(
                    (await getTokenPriceFromCoingecko(addressRegistry.BEETS)).toString(),
                    18
                ).mul(xhre.ethers.utils.parseUnits("1", 18)).div(
                    xhre.ethers.utils.parseUnits(
                        (await getTokenPriceFromCoingecko(addressRegistry.WFTM)).toString(),
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
                await oracle.updateSafePrice(addressRegistry.BEETS);
            });
        });
    });
});

const getTokenPriceFromCoingecko = async function (tokenAddr: string) {
    const apiUrl = `https://api.coingecko.com/api/v3/simple/token_price/fantom?contract_addresses=${tokenAddr}&vs_currencies=usd`;
    const response = await axios.get(apiUrl);
    return response.data[tokenAddr.toLocaleLowerCase()].usd;
};
