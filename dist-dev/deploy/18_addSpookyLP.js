"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPOOKY_SWAP_ROUTER = exports.ADD_SPOOKY_LP_DID = void 0;
const mint_1 = __importDefault(require("../packages/utils/mint"));
const utils_1 = require("../packages/utils/utils");
const typechain_1 = require("../packages/sdk/typechain");
const _03_deployTreasury_1 = require("./03_deployTreasury");
const _04_setVault_1 = require("./04_setVault");
const _15_mintDai_1 = require("./15_mintDai");
const _16_mintOHM_1 = require("./16_mintOHM");
exports.ADD_SPOOKY_LP_DID = "add_spooky_lp_did";
exports.SPOOKY_SWAP_ROUTER = "0xF491e7B69E4244ad4002BC14e878a34207E38c29";
const addSpookyLP = async ({ get, getNamedAccounts, ethers }) => {
    const { deployer } = await getNamedAccounts();
    const { contract: ohm } = await get("OlympusERC20Token");
    const { contract: dai } = await get("DAI");
    const { contract: treasury } = await get("OlympusTreasury");
    const spookyRouter = await typechain_1.IUniswapV2Router__factory.connect(
        exports.SPOOKY_SWAP_ROUTER,
        await ethers.getSigner(deployer)
    );
    await (0, mint_1.default)(
        deployer,
        treasury,
        dai,
        (0, utils_1.toWei)(100, utils_1.DAI_DECIMALS)
    );
    await dai.mint(deployer, (0, utils_1.toWei)(100, utils_1.DAI_DECIMALS));
    const expiration = Math.round(new Date().valueOf() / 1000 + 3600);
    await ohm.approve(
        exports.SPOOKY_SWAP_ROUTER,
        (0, utils_1.toWei)(100, utils_1.OHM_DECIMALS)
    );
    await dai.approve(
        exports.SPOOKY_SWAP_ROUTER,
        (0, utils_1.toWei)(100, utils_1.DAI_DECIMALS)
    );
    await spookyRouter.addLiquidity(
        ohm.address,
        dai.address,
        (0, utils_1.toWei)(100, utils_1.OHM_DECIMALS),
        (0, utils_1.toWei)(100, utils_1.DAI_DECIMALS),
        (0, utils_1.toWei)(99, utils_1.OHM_DECIMALS),
        (0, utils_1.toWei)(99, utils_1.DAI_DECIMALS),
        deployer,
        expiration
    );
};
exports.default = addSpookyLP;
addSpookyLP.id = exports.ADD_SPOOKY_LP_DID;
addSpookyLP.tags = ["local", "test", exports.ADD_SPOOKY_LP_DID];
addSpookyLP.dependencies = [
    _15_mintDai_1.MINT_DAI_DID,
    _16_mintOHM_1.MINT_OHM_DID,
    _03_deployTreasury_1.TREASURY_DID,
    _04_setVault_1.OHM_SET_VAULT_DID,
];
