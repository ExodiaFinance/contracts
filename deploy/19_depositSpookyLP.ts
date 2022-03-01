import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import toggleRights, { MANAGING } from "../src/toggleRights";
import {
    DAI__factory,
    ERC20__factory,
    IUniswapV2Factory__factory,
    OlympusBondingCalculator__factory,
    OlympusERC20Token__factory,
    OlympusTreasury__factory,
} from "../typechain";

import { TREASURY_DID } from "./03_deployTreasury";
import { OHM_SET_VAULT_DID } from "./04_setVault";
import { BONDING_CALCULATOR_DID } from "./09_deployOlympusBondingCalculator";
import { MINT_DAI_DID } from "./15_mintDai";
import { MINT_OHM_DID } from "./16_mintOHM";
import { ADD_SPOOKY_LP_DID } from "./18_addSpookyLP";

export const DEPOSIT_SPOOKY_LP = "deposit_spooky_lp";
export const SPOOKY_SWAP_FACTORY = "0x152eE697f2E276fA89E96742e9bB9aB1F2E61bE3";

const addSpookyLP: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    get,
    getNamedAccounts,
    ethers,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { deployer } = await getNamedAccounts();
    const { contract: ohm } = await get<OlympusERC20Token__factory>("OlympusERC20Token");
    const { contract: dai } = await get<DAI__factory>("DAI");
    const { contract: treasury } = await get<OlympusTreasury__factory>("OlympusTreasury");
    const spookyPairFactory = await IUniswapV2Factory__factory.connect(
        SPOOKY_SWAP_FACTORY,
        await ethers.getSigner(deployer)
    );
    const pair = await spookyPairFactory.getPair(ohm.address, dai.address);
    if (!(await treasury.isLiquidityDepositor(deployer))) {
        await toggleRights(treasury, MANAGING.LIQUIDITYDEPOSITOR, deployer);
    }
    const { contract: bondCalculator } = await get<OlympusBondingCalculator__factory>(
        "OlympusBondingCalculator"
    );
    if (!(await treasury.isLiquidityToken(pair))) {
        await toggleRights(
            treasury,
            MANAGING.LIQUIDITYTOKEN,
            pair,
            bondCalculator.address
        );
    }
    const pairERC = await ERC20__factory.connect(pair, await ethers.getSigner(deployer));
    const balanceOfLP = await pairERC.balanceOf(deployer);
    const depositAmount = balanceOfLP.div(2);
    await pairERC.approve(treasury.address, depositAmount);
    await treasury.deposit(depositAmount, pair, 0);
};

export default addSpookyLP;

addSpookyLP.id = DEPOSIT_SPOOKY_LP;
addSpookyLP.tags = ["local", "test", DEPOSIT_SPOOKY_LP];
addSpookyLP.dependencies = [
    TREASURY_DID,
    OHM_SET_VAULT_DID,
    ADD_SPOOKY_LP_DID,
    BONDING_CALCULATOR_DID,
];
