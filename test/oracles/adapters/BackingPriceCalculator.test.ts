import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import axios from "axios";
import { expect } from "chai";
import hre from "hardhat";

import { EXODIA_ROLES_DID } from "../../../deploy/38_deployExodiaRoles";
import { BACKING_PRICE_CALCULATOR_DID } from "../../../deploy/47_deployBackingPriceCalculator";
import { externalAddressRegistry } from "../../../packages/sdk/contracts";
import {
    IExodiaContractsRegistry,
    IExternalContractsRegistry,
} from "../../../packages/sdk/contracts/exodiaContracts";
import { IExtendedHRE } from "../../../packages/HardhatRegistryExtension/ExtendedHRE";
import { ZERO_ADDRESS } from "../../../packages/utils/utils";
import {
    BackingPriceCalculator,
    BackingPriceCalculator__factory,
    ExodiaRoles,
    ExodiaRoles__factory,
    IERC20,
    MockToken__factory,
    PriceProvider,
    PriceProvider__factory,
    TreasuryTracker,
    TreasuryTracker__factory,
} from "../../../packages/sdk/typechain";
import { MockContract, smock } from "@defi-wonderland/smock";
import { parseUnits } from "ethers/lib/utils";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNetwork } = xhre;

describe("Backing Price Calculator", function () {
    let addressRegistry: IExternalContractsRegistry;
    let owner: SignerWithAddress, user: SignerWithAddress, architect: SignerWithAddress;
    let backingPriceCalculator: BackingPriceCalculator;
    let treasuryTracker: MockContract<TreasuryTracker>;
    let priceProvider: MockContract<PriceProvider>;
    let exod: MockContract<IERC20>,
        mockFTM: MockContract<IERC20>,
        mockUSDC: MockContract<IERC20>;
    let roles: ExodiaRoles;

    before(async function () {
        [owner, user, architect] = await xhre.ethers.getSigners();
        addressRegistry = externalAddressRegistry.forNetwork(await getNetwork());

        const TreasuryTracker = await smock.mock<TreasuryTracker__factory>(
            "TreasuryTracker"
        );
        treasuryTracker = await TreasuryTracker.deploy();

        const PriceProvider = await smock.mock<PriceProvider__factory>("PriceProvider");
        priceProvider = await PriceProvider.deploy();

        const MockToken = await smock.mock<MockToken__factory>("MockToken");
        exod = await MockToken.deploy(18);
        mockFTM = await MockToken.deploy(18);
        mockUSDC = await MockToken.deploy(6);
    });

    beforeEach(async function () {
        await deployments.fixture([EXODIA_ROLES_DID, BACKING_PRICE_CALCULATOR_DID]);
        const oracleDeployment = await get<BackingPriceCalculator__factory>(
            "BackingPriceCalculator"
        );
        backingPriceCalculator = await oracleDeployment.contract;

        const rolesDeployment = await get<ExodiaRoles__factory>("ExodiaRoles");
        roles = await rolesDeployment.contract;

        await roles.addArchitect(architect.address);
    });

    it("Can't initialize with zero addresses", async function () {
        await expect(
            backingPriceCalculator.initialize(
                ZERO_ADDRESS,
                treasuryTracker.address,
                priceProvider.address,
                exod.address
            )
        ).to.revertedWith("roles cannot be null address");
        await expect(
            backingPriceCalculator.initialize(
                roles.address,
                ZERO_ADDRESS,
                priceProvider.address,
                exod.address
            )
        ).to.revertedWith("treasury tracker cannot be null address");
        await expect(
            backingPriceCalculator.initialize(
                roles.address,
                treasuryTracker.address,
                ZERO_ADDRESS,
                exod.address
            )
        ).to.revertedWith("price provider cannot be null address");
        await expect(
            backingPriceCalculator.initialize(
                roles.address,
                treasuryTracker.address,
                priceProvider.address,
                ZERO_ADDRESS
            )
        ).to.revertedWith("EXOD cannot be null address");
    });

    it("Should be able to initialize", async function () {
        await backingPriceCalculator.initialize(
            roles.address,
            treasuryTracker.address,
            priceProvider.address,
            exod.address
        );
    });

    it("Can't initialize twice", async function () {
        await backingPriceCalculator.initialize(
            roles.address,
            treasuryTracker.address,
            priceProvider.address,
            exod.address
        );

        await expect(
            backingPriceCalculator.initialize(
                roles.address,
                treasuryTracker.address,
                priceProvider.address,
                exod.address
            )
        ).to.revertedWith("Initializable: contract is already initialized");
    });

    describe("After initialization", function () {
        beforeEach(async function () {
            await backingPriceCalculator.initialize(
                roles.address,
                treasuryTracker.address,
                priceProvider.address,
                exod.address
            );
        });

        it("Only architect can set treasury tracker", async function () {
            await expect(
                backingPriceCalculator
                    .connect(user)
                    .setTreasuryTracker(treasuryTracker.address)
            ).to.revertedWith("caller is not an architect");

            await backingPriceCalculator.setTreasuryTracker(treasuryTracker.address);
        });

        it("Only architect can set price provider", async function () {
            await expect(
                backingPriceCalculator
                    .connect(user)
                    .setPriceProvider(priceProvider.address)
            ).to.revertedWith("caller is not an architect");

            await backingPriceCalculator.setPriceProvider(priceProvider.address);
        });

        it("Only architect can set exod address", async function () {
            await expect(
                backingPriceCalculator.connect(user).setEXODAddress(exod.address)
            ).to.revertedWith("caller is not an architect");

            await backingPriceCalculator.setEXODAddress(exod.address);
        });

        it("Should return correct backing price: no asset", async function () {
            exod.totalSupply.returns(1000000);
            treasuryTracker.balances.returns([[], []]);

            await backingPriceCalculator.fetchBackingPrice();

            expect(await backingPriceCalculator.getBackingPrice()).to.equal(0);
        });

        it("Should return correct backing price: one asset available", async function () {
            exod.totalSupply.returns(parseUnits("1000000"));
            treasuryTracker.balances.returns([
                [mockFTM.address],
                [parseUnits("10000000")],
            ]);
            priceProvider.getSafePrice.returns(parseUnits("2"));

            await backingPriceCalculator.fetchBackingPrice();

            expect(await backingPriceCalculator.getBackingPrice()).to.equal(
                parseUnits("20")
            );
        });

        it("Should return correct backing price: more than one assets available", async function () {
            exod.totalSupply.returns(parseUnits("1000000"));
            treasuryTracker.balances.returns([
                [mockFTM.address, mockUSDC.address],
                [parseUnits("10000000"), parseUnits("10000000", 6)],
            ]);
            priceProvider.getSafePrice
                .whenCalledWith(mockFTM.address)
                .returns(parseUnits("2"));
            priceProvider.getSafePrice
                .whenCalledWith(mockUSDC.address)
                .returns(parseUnits("1"));

            await backingPriceCalculator.fetchBackingPrice();

            expect(await backingPriceCalculator.getBackingPrice()).to.equal(
                parseUnits("30")
            );
        });
    });
});
