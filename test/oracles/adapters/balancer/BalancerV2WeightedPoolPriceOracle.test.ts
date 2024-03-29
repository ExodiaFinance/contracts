import { MockContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { parseUnits } from "ethers/lib/utils";
import hre, { ethers } from "hardhat";

import { EXODIA_ROLES_DID } from "../../../../deploy/38_deployExodiaRoles";
import { BALANCER_V2_WEIGHTED_POOL_PRICE_ORACLE_DID } from "../../../../deploy/51_deployBalancerV2WeightedPoolPriceOracle";
import { IExtendedHRE } from "../../../../packages/HardhatRegistryExtension/ExtendedHRE";
import { externalAddressRegistry } from "../../../../packages/sdk/contracts";
import {
    IExodiaContractsRegistry,
    IExternalContractsRegistry,
} from "../../../../packages/sdk/contracts/exodiaContracts";
import {
    BalancerV2WeightedPoolPriceOracle,
    BalancerV2WeightedPoolPriceOracle__factory,
    ERC20,
    ExodiaRoles,
    ExodiaRoles__factory,
    IBPoolV2,
    IBVaultV2,
    IERC20,
    PriceProvider,
    PriceProvider__factory,
} from "../../../../packages/sdk/typechain";
import { ZERO_ADDRESS } from "../../../../packages/utils/utils";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNetwork } = xhre;

const BALANCER_USDC_FTM_POOL_ID =
    "0xcdf68a4d525ba2e90fe959c74330430a5a6b8226000200000000000000000008";
const BALANCER_USDC_FTM = "0xcdF68a4d525Ba2E90Fe959c74330430A5a6b8226";
const USDC_ADDRESS = "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75";
const WFTM_ADDRESS = "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83";

describe("Balancer V2 Weighted Pool Price Oracle", function () {
    let addressRegistry: IExternalContractsRegistry;
    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let architect: SignerWithAddress;
    let oracle: BalancerV2WeightedPoolPriceOracle;
    let priceProvider: MockContract<PriceProvider>;
    let roles: ExodiaRoles;

    before(async function () {
        [owner, user, architect] = await xhre.ethers.getSigners();
        addressRegistry = externalAddressRegistry.forNetwork(await getNetwork());

        const priceProviderFactory = await smock.mock<PriceProvider__factory>(
            "PriceProvider"
        );
        priceProvider = await priceProviderFactory.deploy();
    });

    beforeEach(async function () {
        await deployments.fixture([
            EXODIA_ROLES_DID,
            BALANCER_V2_WEIGHTED_POOL_PRICE_ORACLE_DID,
        ]);
        const oracleDeployment = await get<BalancerV2WeightedPoolPriceOracle__factory>(
            "BalancerV2WeightedPoolPriceOracle"
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
                priceProvider.address
            )
        ).to.revertedWith("roles cannot be null address");
        await expect(
            oracle.initialize(roles.address, ZERO_ADDRESS, priceProvider.address)
        ).to.revertedWith("vault cannot be null address");
    });

    it("Should be able to initialize", async function () {
        await oracle.initialize(
            roles.address,
            addressRegistry.BEETHOVEN_VAULT,
            priceProvider.address
        );

        expect(await oracle.vault()).to.equal(addressRegistry.BEETHOVEN_VAULT);
    });

    it("Can't initialize twice", async function () {
        await oracle.initialize(
            roles.address,
            addressRegistry.BEETHOVEN_VAULT,
            priceProvider.address
        );

        await expect(
            oracle.initialize(
                ZERO_ADDRESS,
                addressRegistry.BEETHOVEN_VAULT,
                priceProvider.address
            )
        ).to.revertedWith("Initializable: contract is already initialized");
    });

    describe("After initialization", function () {
        beforeEach(async function () {
            await oracle.initialize(
                roles.address,
                addressRegistry.BEETHOVEN_VAULT,
                priceProvider.address
            );

            await oracle.connect(architect).setRatioDiffLimit(1, 100); // ratio diff limit: 1%
        });

        describe("Balancer USDC FTM", function () {
            let bpt: IBPoolV2;
            let vault: IBVaultV2;

            beforeEach(async function () {
                priceProvider.getSafePrice
                    .whenCalledWith(USDC_ADDRESS)
                    .returns(parseUnits("0.75"));
                priceProvider.getCurrentPrice
                    .whenCalledWith(WFTM_ADDRESS)
                    .returns(parseUnits("0.75"));

                bpt = await ethers.getContractAt("IBPoolV2", BALANCER_USDC_FTM);
                vault = await ethers.getContractAt(
                    "IBVaultV2",
                    addressRegistry.BEETHOVEN_VAULT
                );
            });

            it("Should be able to get current price", async function () {
                const price = await oracle.getCurrentPrice(BALANCER_USDC_FTM);

                const poolTokens = await vault.getPoolTokens(BALANCER_USDC_FTM_POOL_ID);

                const tvl = poolTokens.balances[0]
                    .mul(parseUnits("0.75"))
                    .div(parseUnits("1", 6))
                    .add(poolTokens.balances[1]);
                const tvlFromBPT = (await bpt.totalSupply())
                    .mul(price)
                    .div(parseUnits("1"));

                expect(tvl).to.closeTo(tvlFromBPT, parseUnits("1") as any); // 1 FTM difference
            });

            it("Should be able to get safe price", async function () {
                const price = await oracle.getSafePrice(BALANCER_USDC_FTM);

                const poolTokens = await vault.getPoolTokens(BALANCER_USDC_FTM_POOL_ID);

                const tvl = poolTokens.balances[0]
                    .mul(parseUnits("0.75"))
                    .div(parseUnits("1", 6))
                    .add(poolTokens.balances[1]);
                const tvlFromBPT = (await bpt.totalSupply())
                    .mul(price)
                    .div(parseUnits("1"));

                expect(tvl).to.closeTo(tvlFromBPT, parseUnits("1") as any); // 1 FTM difference
            });

            it("Should be able to update safe price", async function () {
                await oracle.updateSafePrice(BALANCER_USDC_FTM);
            });

            it("Should check ratio of the pool", async function () {
                await oracle.connect(architect).setRatioDiffLimit(1, 1000); // ratio diff limit: 0.1%

                await expect(oracle.getSafePrice(BALANCER_USDC_FTM)).to.revertedWith(
                    "INVALID RATIO"
                );
            });
        });
    });
});
