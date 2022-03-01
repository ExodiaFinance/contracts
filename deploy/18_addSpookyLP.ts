import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import mint from "../src/mint";
import { DAI_DECIMALS, OHM_DECIMALS, toWei } from "../src/utils";
import {
    DAI__factory,
    IUniswapV2Router__factory,
    OlympusERC20Token__factory,
    OlympusTreasury__factory,
} from "../typechain";

import { TREASURY_DID } from "./03_deployTreasury";
import { OHM_SET_VAULT_DID } from "./04_setVault";
import { MINT_DAI_DID } from "./15_mintDai";
import { MINT_OHM_DID } from "./16_mintOHM";

export const ADD_SPOOKY_LP_DID = "add_spooky_lp_did";
export const SPOOKY_SWAP_ROUTER = "0xF491e7B69E4244ad4002BC14e878a34207E38c29";

const addSpookyLP: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    get,
    getNamedAccounts,
    ethers,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { deployer } = await getNamedAccounts();
    const { contract: ohm } = await get<OlympusERC20Token__factory>("OlympusERC20Token");
    const { contract: dai } = await get<DAI__factory>("DAI");
    const { contract: treasury } = await get<OlympusTreasury__factory>("OlympusTreasury");
    const spookyRouter = await IUniswapV2Router__factory.connect(
        SPOOKY_SWAP_ROUTER,
        await ethers.getSigner(deployer)
    );
    await mint(deployer, treasury, dai, toWei(100, DAI_DECIMALS));
    await dai.mint(deployer, toWei(100, DAI_DECIMALS));
    const expiration = Math.round(new Date().valueOf() / 1000 + 3600);
    await ohm.approve(SPOOKY_SWAP_ROUTER, toWei(100, OHM_DECIMALS));
    await dai.approve(SPOOKY_SWAP_ROUTER, toWei(100, DAI_DECIMALS));
    await spookyRouter.addLiquidity(
        ohm.address,
        dai.address,
        toWei(100, OHM_DECIMALS),
        toWei(100, DAI_DECIMALS),
        toWei(99, OHM_DECIMALS),
        toWei(99, DAI_DECIMALS),
        deployer,
        expiration
    );
};
export default addSpookyLP;

addSpookyLP.id = ADD_SPOOKY_LP_DID;
addSpookyLP.tags = ["local", "test", ADD_SPOOKY_LP_DID];
addSpookyLP.dependencies = [MINT_DAI_DID, MINT_OHM_DID, TREASURY_DID, OHM_SET_VAULT_DID];
