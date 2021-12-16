import { expect } from "chai";
import hre from "hardhat";
import { DAI_DID } from "../../../deploy/00_deployDai";
import { OHM_DID } from "../../../deploy/01_deployOhm";

import { TREASURY_DID } from "../../../deploy/03_deployTreasury";
import { OHM_SET_VAULT_DID } from "../../../deploy/04_setVault";
import { BONDING_CALCULATOR_DID } from "../../../deploy/09_deployOlympusBondingCalculator";
import { MINT_DAI_DID } from "../../../deploy/15_mintDai";
import { ADD_SPOOKY_LP_DID, SPOOKY_SWAP_ROUTER } from "../../../deploy/18_addSpookyLP";
import {
    DEPOSIT_SPOOKY_LP,
    SPOOKY_SWAP_FACTORY,
} from "../../../deploy/19_depositSpookyLP";
import { DEPLOY_REMOVE_UNI_LP_STRATEGY_DID } from "../../../deploy/20_deployRemoveUniLPStrategy";
import { IExodiaContractsRegistry } from "../../../src/contracts/exodiaContracts";
import { IExtendedHRE } from "../../../src/HardhatRegistryExtension/ExtendedHRE";
import mint from "../../../src/subdeploy/mint";
import { DAI_DECIMALS, OHM_DECIMALS, toWei } from "../../../src/utils";

import {
    DAI,
    DAI__factory,
    ERC20__factory,
    OlympusERC20Token,
    OlympusERC20Token__factory,
    OlympusTreasury,
    OlympusTreasury__factory,
    RemoveUniLp,
    RemoveUniLp__factory,
    UniswapV2Factory,
    UniswapV2Factory__factory,
    UniswapV2Pair__factory,
    UniswapV2Router02,
    UniswapV2Router02__factory,
} from "../../../typechain";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, deploy } = xhre;

const FLOATING_POINT_DECIMALS = 18;

describe("test treasury", function () {
    let treasury: OlympusTreasury;
    let ohm: OlympusERC20Token;
    let dai: DAI;
    let spookyRouter: UniswapV2Router02;
    let spookyFactory: UniswapV2Factory;
    let deployer: string;
    let strategy: RemoveUniLp;

    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
        await deployments.fixture([
            TREASURY_DID,
            OHM_SET_VAULT_DID,
            DEPOSIT_SPOOKY_LP,
            BONDING_CALCULATOR_DID,
            DEPLOY_REMOVE_UNI_LP_STRATEGY_DID,
        ]);
        const treasuryDeployment = await get<OlympusTreasury__factory>("OlympusTreasury");
        treasury = treasuryDeployment.contract;
        const ohmDeployment = await get<OlympusERC20Token__factory>("OlympusERC20Token");
        ohm = ohmDeployment.contract;
        const daiDeployment = await get<DAI__factory>("DAI");
        dai = daiDeployment.contract;
        spookyRouter = await UniswapV2Router02__factory.connect(
            SPOOKY_SWAP_ROUTER,
            await xhre.ethers.getSigner(deployer)
        );
        spookyFactory = await UniswapV2Factory__factory.connect(
            SPOOKY_SWAP_FACTORY,
            await xhre.ethers.getSigner(deployer)
        );
        const strategyDeployment = await get<RemoveUniLp__factory>("RemoveUniLp");
        strategy = strategyDeployment.contract;
    });

    it("can swap dai to ohm", async function () {
        const expiration = Math.round(new Date().valueOf() / 1000 + 3600);
        await dai.mint(deployer, toWei(100, DAI_DECIMALS));
        await dai.approve(spookyRouter.address, toWei(1, DAI_DECIMALS));
        await spookyRouter.swapExactTokensForTokens(
            toWei(1, DAI_DECIMALS),
            toWei(0.9, OHM_DECIMALS),
            [dai.address, ohm.address],
            deployer,
            expiration
        );
    });

    it("removes lp and deposit the assets", async function () {
        await dai.mint(deployer, toWei(999, DAI_DECIMALS));
        await dai.approve(treasury.address, toWei(999, DAI_DECIMALS));
        await treasury.deposit(
            toWei(999, DAI_DECIMALS),
            dai.address,
            toWei(999, OHM_DECIMALS)
        );
        const preDaiTreasuryBalance = await dai.balanceOf(treasury.address);
        const pairAddress = await spookyFactory.getPair(ohm.address, dai.address);
        const pair = UniswapV2Pair__factory.connect(
            pairAddress,
            await xhre.ethers.getSigner(deployer)
        );
        const lpDaiBalance = await dai.balanceOf(pair.address);
        const lpOhmBalance = await ohm.balanceOf(pair.address);
        expect(lpDaiBalance.toString()).to.not.eq("0");
        const lpTotalSupply = await pair.totalSupply();
        const preLpBal = await pair.balanceOf(treasury.address);
        const preExcessReserve = await treasury.excessReserves();
        await strategy.remove(SPOOKY_SWAP_ROUTER, pairAddress);
        const lpTreasuryBal = await pair.balanceOf(treasury.address);
        expect(lpTreasuryBal.toString()).to.eq("0");
        const daiTreasuryBalance = await dai.balanceOf(treasury.address);
        const daiOut = preLpBal.mul(lpDaiBalance).div(lpTotalSupply);
        const depositedDai = daiTreasuryBalance.sub(preDaiTreasuryBalance);
        expect(depositedDai.sub(daiOut).toNumber()).to.lt(1e9);
        const ohmTreasuryBalance = await ohm.balanceOf(treasury.address);
        const ohmOut = preLpBal.mul(lpOhmBalance).div(lpTotalSupply);
        expect(ohmTreasuryBalance.sub(ohmOut).toNumber()).to.lt(1e9);
        // Make sure no ohm is minted
        const strategyOhmBalance = await ohm.balanceOf(strategy.address);
        expect(strategyOhmBalance.toString()).to.eq("0");
        // Mare sure the DAI deposited goes toward the excess reserve
        const excessReserve = await treasury.excessReserves();
        const diffExcessReserve = excessReserve.sub(preExcessReserve);
        expect(preExcessReserve.lt(excessReserve)).true;
        expect(diffExcessReserve.sub(daiOut.div(1e9)).toNumber()).to.lt(1e6);
    });
});
