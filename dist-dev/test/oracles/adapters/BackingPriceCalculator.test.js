"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = __importDefault(require("hardhat"));
const _38_deployExodiaRoles_1 = require("../../../deploy/38_deployExodiaRoles");
const _47_deployBackingPriceCalculator_1 = require("../../../deploy/47_deployBackingPriceCalculator");
const contracts_1 = require("../../../packages/sdk/contracts");
const utils_1 = require("../../../packages/utils/utils");
const smock_1 = require("@defi-wonderland/smock");
const utils_2 = require("ethers/lib/utils");
const xhre = hardhat_1.default;
const { deployments, get, getNetwork } = xhre;
describe("Backing Price Calculator", function () {
    let addressRegistry;
    let owner, user, architect;
    let backingPriceCalculator;
    let treasuryTracker;
    let priceProvider;
    let exod, mockFTM, mockUSDC;
    let roles;
    before(async function () {
        [owner, user, architect] = await xhre.ethers.getSigners();
        addressRegistry = contracts_1.externalAddressRegistry.forNetwork(
            await getNetwork()
        );
        const TreasuryTracker = await smock_1.smock.mock("TreasuryTracker");
        treasuryTracker = await TreasuryTracker.deploy();
        const PriceProvider = await smock_1.smock.mock("PriceProvider");
        priceProvider = await PriceProvider.deploy();
        const MockToken = await smock_1.smock.mock("MockToken");
        exod = await MockToken.deploy(18);
        mockFTM = await MockToken.deploy(18);
        mockUSDC = await MockToken.deploy(6);
    });
    beforeEach(async function () {
        await deployments.fixture([
            _38_deployExodiaRoles_1.EXODIA_ROLES_DID,
            _47_deployBackingPriceCalculator_1.BACKING_PRICE_CALCULATOR_DID,
        ]);
        const oracleDeployment = await get("BackingPriceCalculator");
        backingPriceCalculator = await oracleDeployment.contract;
        const rolesDeployment = await get("ExodiaRoles");
        roles = await rolesDeployment.contract;
        await roles.addArchitect(architect.address);
    });
    it("Can't initialize with zero addresses", async function () {
        await (0, chai_1.expect)(
            backingPriceCalculator.initialize(
                utils_1.ZERO_ADDRESS,
                treasuryTracker.address,
                priceProvider.address,
                exod.address
            )
        ).to.revertedWith("roles cannot be null address");
        await (0, chai_1.expect)(
            backingPriceCalculator.initialize(
                roles.address,
                utils_1.ZERO_ADDRESS,
                priceProvider.address,
                exod.address
            )
        ).to.revertedWith("treasury tracker cannot be null address");
        await (0, chai_1.expect)(
            backingPriceCalculator.initialize(
                roles.address,
                treasuryTracker.address,
                utils_1.ZERO_ADDRESS,
                exod.address
            )
        ).to.revertedWith("price provider cannot be null address");
        await (0, chai_1.expect)(
            backingPriceCalculator.initialize(
                roles.address,
                treasuryTracker.address,
                priceProvider.address,
                utils_1.ZERO_ADDRESS
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
        await (0, chai_1.expect)(
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
            await (0, chai_1.expect)(
                backingPriceCalculator
                    .connect(user)
                    .setTreasuryTracker(treasuryTracker.address)
            ).to.revertedWith("caller is not an architect");
            await backingPriceCalculator.setTreasuryTracker(treasuryTracker.address);
        });
        it("Only architect can set price provider", async function () {
            await (0, chai_1.expect)(
                backingPriceCalculator
                    .connect(user)
                    .setPriceProvider(priceProvider.address)
            ).to.revertedWith("caller is not an architect");
            await backingPriceCalculator.setPriceProvider(priceProvider.address);
        });
        it("Only architect can set exod address", async function () {
            await (0, chai_1.expect)(
                backingPriceCalculator.connect(user).setEXODAddress(exod.address)
            ).to.revertedWith("caller is not an architect");
            await backingPriceCalculator.setEXODAddress(exod.address);
        });
        it("Should return correct backing price: no asset", async function () {
            exod.totalSupply.returns(1000000);
            treasuryTracker.balances.returns([[], []]);
            await backingPriceCalculator.fetchBackingPrice();
            (0, chai_1.expect)(await backingPriceCalculator.getBackingPrice()).to.equal(
                0
            );
        });
        it("Should return correct backing price: one asset available", async function () {
            exod.totalSupply.returns((0, utils_2.parseUnits)("1000000"));
            treasuryTracker.balances.returns([
                [mockFTM.address],
                [(0, utils_2.parseUnits)("10000000")],
            ]);
            priceProvider.getSafePrice.returns((0, utils_2.parseUnits)("2"));
            await backingPriceCalculator.fetchBackingPrice();
            (0, chai_1.expect)(await backingPriceCalculator.getBackingPrice()).to.equal(
                (0, utils_2.parseUnits)("20")
            );
        });
        it("Should return correct backing price: more than one assets available", async function () {
            exod.totalSupply.returns((0, utils_2.parseUnits)("1000000"));
            treasuryTracker.balances.returns([
                [mockFTM.address, mockUSDC.address],
                [
                    (0, utils_2.parseUnits)("10000000"),
                    (0, utils_2.parseUnits)("10000000", 6),
                ],
            ]);
            priceProvider.getSafePrice
                .whenCalledWith(mockFTM.address)
                .returns((0, utils_2.parseUnits)("2"));
            priceProvider.getSafePrice
                .whenCalledWith(mockUSDC.address)
                .returns((0, utils_2.parseUnits)("1"));
            await backingPriceCalculator.fetchBackingPrice();
            (0, chai_1.expect)(await backingPriceCalculator.getBackingPrice()).to.equal(
                (0, utils_2.parseUnits)("30")
            );
        });
    });
});
