import { MockContract, MockContractFactory, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseEther, parseUnits } from "ethers/lib/utils";
import hre from "hardhat";

import { EXODIA_ROLES_DID } from "../../../../deploy/38_deployExodiaRoles";
import { SOLIDLY_TWAP_ORACLE_DID } from "../../../../deploy/50_deploySolidlyTwapOracle";
import { IExtendedHRE } from "../../../../packages/HardhatRegistryExtension/ExtendedHRE";
import { externalAddressRegistry } from "../../../../packages/sdk";
import { IExodiaContractsRegistry } from "../../../../packages/sdk/contracts/exodiaContracts";
import {
    ExodiaRoles__factory,
    PriceProvider,
    PriceProvider__factory,
    SolidlyTWAPOracle,
    SolidlyTWAPOracle__factory,
} from "../../../../packages/sdk/typechain";
import "../../../chai-setup";
import { getTokenPriceFromCoingecko } from "../../../testUtils";
const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, getUnnamedAccounts, getNetwork } = xhre;

describe("Start test file", function () {
    let deployer: SignerWithAddress;
    let otherAccount: SignerWithAddress;

    let oracle: SolidlyTWAPOracle;
    let pp: MockContract<PriceProvider>;

    // Use a fixture to deploy new contracts to speed up testing time
    const setup = deployments.createFixture(async (hh) => {
        await deployments.fixture([EXODIA_ROLES_DID]);
        const deployment = await deployments.deploy("SolidlyTWAPOracle", {
            from: deployer.address,
        });
        oracle = SolidlyTWAPOracle__factory.connect(deployment.address, deployer);
        const ppFactory = await smock.mock<PriceProvider__factory>("PriceProvider");
        const { contract: roles } = await get<ExodiaRoles__factory>("ExodiaRoles");
        pp = await ppFactory.deploy();
        await pp.initialize(roles.address);
        const { WFTM } = externalAddressRegistry.forNetwork(await getNetwork());
        await oracle.initialize(WFTM, pp.address, roles.address);
    });

    beforeEach(async function () {
        const { deployer: deployerAddress } = await getNamedAccounts();
        const [address0] = await getUnnamedAccounts();
        deployer = await xhre.ethers.getSigner(deployerAddress);
        otherAccount = await xhre.ethers.getSigner(address0);
        await setup();
    });

    describe("for token paired with FTM", async function () {
        const V_OATH_WFTM_PAIR = "0x6B987e02Ca5eAE26D8B2bCAc724D4e03b3B0c295";
        const OATH = "0x21Ada0D2aC28C3A5Fa3cD2eE30882dA8812279B6";

        beforeEach(async () => {
            await oracle.setPair(OATH, V_OATH_WFTM_PAIR);
        });

        it("Should return the OATH price in FTM", async function () {
            const oathFtm = await oracle.getSafePrice(OATH);
            const { WFTM } = externalAddressRegistry.forNetwork(await getNetwork());
            const ftmUsd = await getTokenPriceFromCoingecko(WFTM);
            const oathUsd = await getTokenPriceFromCoingecko(OATH);
            expect(oathFtm).to.be.closeTo(
                parseEther(`${oathUsd / ftmUsd}`),
                oathFtm.mul(2).div(100) as any
            );
        });
    });

    describe("for token not paired with FTM", async function () {
        const V_USDC_SYN = "0xB1b3B96cf35435b2518093acD50E02fe03A0131f";
        const SYN = "0xE55e19Fb4F2D85af758950957714292DAC1e25B2";

        beforeEach(async () => {
            await oracle.setPair(SYN, V_USDC_SYN);
        });

        it("Should return the SYN price in FTM", async function () {
            const ftmUsd = 2;
            pp.getSafePrice.returns(parseEther(`${1 / ftmUsd}`)); // price provider returns price of USDC in FTM
            const synFtm = await oracle.getSafePrice(SYN);
            const { USDC } = externalAddressRegistry.forNetwork(await getNetwork());
            expect(pp.getSafePrice).to.have.been.calledWith(USDC);
            const synUsd = await getTokenPriceFromCoingecko(SYN);

            expect(synFtm).to.be.closeTo(
                parseEther(`${synUsd / ftmUsd}`),
                synFtm.mul(2).div(100) as any
            );
        });
    });
});
