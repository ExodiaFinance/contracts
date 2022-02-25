import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import hre from "hardhat";
import axios from "axios";

import { EXODIA_ROLES_DID } from "../../../../deploy/38_deployExodiaRoles";
import { BALANCER_V2_PRICE_ORACLE_DID } from "../../../../deploy/41_deployBalancerV2PriceOracle";
import { IExodiaContractsRegistry } from "../../../../src/contracts/exodiaContracts";
import { IExtendedHRE } from "../../../../src/HardhatRegistryExtension/ExtendedHRE";
import { ZERO_ADDRESS } from "../../../../src/utils";
import {
    BalancerV2PriceOracle,
    BalancerV2PriceOracle__factory,
    ExodiaRoles,
    ExodiaRoles__factory,
} from "../../../../typechain";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, deploy, getNetwork } = xhre;

const BALANCER_V2_VAULT = "0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce";
const BEETS = "0xF24Bcf4d1e507740041C9cFd2DddB29585aDCe1e";
const WFTM = "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83";
const WBTC = "0x321162Cd933E2Be498Cd2267a90534A804051b11";
const BEETS_FTM_POOL = "0xcdE5a11a4ACB4eE4c805352Cec57E236bdBC3837";
const MINIMUM_UPDATE_INTERVAL = 60 * 5; // 5 mins
const FTM_USD_FEED = "0xf4766552D15AE4d256Ad41B6cf2933482B0680dc";
const USDC_WFTM_BTC_ETH_POOL = "0xf3A602d30dcB723A74a0198313a7551FEacA7DAc";

describe("Balancer V2 Price Oracle", function () {
    let owner: SignerWithAddress, user: SignerWithAddress, architect: SignerWithAddress;
    let oracle: BalancerV2PriceOracle;
    let roles: ExodiaRoles;

    beforeEach(async function () {
        [owner, user, architect] = await xhre.ethers.getSigners();

        await deployments.fixture([EXODIA_ROLES_DID, BALANCER_V2_PRICE_ORACLE_DID]);
        const oracleDeployment = await get<BalancerV2PriceOracle__factory>(
            "BalancerV2PriceOracle"
        );
        oracle = await oracleDeployment.contract;
        const rolesDeployment = await get<ExodiaRoles__factory>("ExodiaRoles");
        roles = await rolesDeployment.contract;

        await roles.addArchitect(architect.address);
    });

    it("Can't initialize with zero addresses", async () => {
        await expect(
            oracle.initialize(ZERO_ADDRESS, BALANCER_V2_VAULT, MINIMUM_UPDATE_INTERVAL)
        ).to.revertedWith("roles cannot be null address");
        await expect(
            oracle.initialize(roles.address, ZERO_ADDRESS, MINIMUM_UPDATE_INTERVAL)
        ).to.revertedWith("vault cannot be null address");
    });

    it("Should be able to initialize", async () => {
        await oracle.initialize(
            roles.address,
            BALANCER_V2_VAULT,
            MINIMUM_UPDATE_INTERVAL
        );

        expect(await oracle.vault()).to.equal(BALANCER_V2_VAULT);
    });

    it("Only architect can set token oracle settings", async () => {
        await oracle.initialize(
            roles.address,
            BALANCER_V2_VAULT,
            MINIMUM_UPDATE_INTERVAL
        );

        await expect(
            oracle.connect(user).setTokenOracle(BEETS, BEETS_FTM_POOL, FTM_USD_FEED)
        ).to.revertedWith("caller is not an architect");
    });

    it("Only support 2-token pools", async () => {
        await oracle.initialize(
            roles.address,
            BALANCER_V2_VAULT,
            MINIMUM_UPDATE_INTERVAL
        );

        await expect(
            oracle
                .connect(architect)
                .setTokenOracle(BEETS, USDC_WFTM_BTC_ETH_POOL, FTM_USD_FEED)
        ).to.revertedWith("INVALID POOL");
    });

    it("Check if token matches to the pool", async () => {
        await oracle.initialize(
            roles.address,
            BALANCER_V2_VAULT,
            MINIMUM_UPDATE_INTERVAL
        );

        await expect(
            oracle.connect(architect).setTokenOracle(WBTC, BEETS_FTM_POOL, FTM_USD_FEED)
        ).to.revertedWith("INVALID TOKENS");
    });

    it("Architect can set oracle settings", async () => {
        await oracle.initialize(
            roles.address,
            BALANCER_V2_VAULT,
            MINIMUM_UPDATE_INTERVAL
        );

        await oracle
            .connect(architect)
            .setTokenOracle(BEETS, BEETS_FTM_POOL, FTM_USD_FEED);

        expect(await oracle.tokenPools(BEETS)).to.equal(BEETS_FTM_POOL);
        expect(await oracle.denominatedOracles(BEETS)).to.equal(FTM_USD_FEED);
    });

    it("Can't get price for unsupported", async () => {
        await oracle.initialize(
            roles.address,
            BALANCER_V2_VAULT,
            MINIMUM_UPDATE_INTERVAL
        );

        await expect(oracle.getCurrentPrice(BEETS)).to.revertedWith("UNSUPPORTED");
        await expect(oracle.getSafePrice(BEETS)).to.revertedWith("UNSUPPORTED");
        await expect(oracle.updateSafePrice(BEETS)).to.revertedWith("UNSUPPORTED");
    });

    it("Should be able to get current price", async () => {
        await oracle.initialize(
            roles.address,
            BALANCER_V2_VAULT,
            MINIMUM_UPDATE_INTERVAL
        );

        await oracle
            .connect(architect)
            .setTokenOracle(BEETS, BEETS_FTM_POOL, FTM_USD_FEED);

        const price = await oracle.getCurrentPrice(BEETS);
        const priceFromCongecko = xhre.ethers.utils.parseUnits(
            (await getTokenPriceFromCoingecko(BEETS)).toString(),
            18
        );
        console.log("current price from oracle = ", price.toString());
        console.log("price from coingecko = ", priceFromCongecko.toString());
        expect(price).to.be.closeTo(priceFromCongecko, price.mul(2).div(100) as any); // 2% diff
    });

    it("Should be able to get safe price", async () => {
        await oracle.initialize(
            roles.address,
            BALANCER_V2_VAULT,
            MINIMUM_UPDATE_INTERVAL
        );

        await oracle
            .connect(architect)
            .setTokenOracle(BEETS, BEETS_FTM_POOL, FTM_USD_FEED);

        const price = await oracle.getSafePrice(BEETS);
        const priceFromCongecko = xhre.ethers.utils.parseUnits(
            (await getTokenPriceFromCoingecko(BEETS)).toString(),
            18
        );
        console.log("safe price from oracle = ", price.toString());
        console.log("price from coingecko = ", priceFromCongecko.toString());
        expect(price).to.be.closeTo(priceFromCongecko, price.mul(2).div(100) as any); // 2% diff
    });

    it("Should be able to update safe price", async () => {
        await oracle.initialize(
            roles.address,
            BALANCER_V2_VAULT,
            MINIMUM_UPDATE_INTERVAL
        );

        await oracle
            .connect(architect)
            .setTokenOracle(BEETS, BEETS_FTM_POOL, FTM_USD_FEED);

        await oracle.updateSafePrice(BEETS);
    });
});

const getTokenPriceFromCoingecko = async (tokenAddr: string) => {
    const apiUrl = `https://api.coingecko.com/api/v3/simple/token_price/fantom?contract_addresses=${tokenAddr}&vs_currencies=usd`;
    const response = await axios.get(apiUrl);
    return response.data[tokenAddr.toLocaleLowerCase()].usd;
};
