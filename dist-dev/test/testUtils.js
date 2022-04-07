"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenPriceFromCoingecko =
    exports.impersonate =
    exports.mine =
    exports.setTimestamp =
    exports.increaseTime =
        void 0;
const axios_1 = __importDefault(require("axios"));
const increaseTime = async (hre, seconds, blocks = 1) => {
    await hre.network.provider.request({
        method: "evm_increaseTime",
        params: [seconds],
    });
    await (0, exports.mine)(hre, blocks);
};
exports.increaseTime = increaseTime;
const setTimestamp = async (hre, timestamp, blocks = 1) => {
    await hre.network.provider.request({
        method: "evm_setNextBlockTimestamp",
        params: [timestamp.getTime() / 1000],
    });
    await (0, exports.mine)(hre, blocks);
};
exports.setTimestamp = setTimestamp;
const mine = async (hre, blocks = 1) => {
    for (let i = 0; i < blocks; i++) {
        await hre.network.provider.request({
            method: "evm_mine",
        });
    }
};
exports.mine = mine;
const impersonate = async (hre, address) => {
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [address],
    });
    return hre.ethers.getSigner(address);
};
exports.impersonate = impersonate;
const getTokenPriceFromCoingecko = async function (tokenAddr) {
    const apiUrl = `https://api.coingecko.com/api/v3/simple/token_price/fantom?contract_addresses=${tokenAddr}&vs_currencies=usd`;
    const response = await axios_1.default.get(apiUrl);
    return response.data[tokenAddr.toLocaleLowerCase()].usd;
};
exports.getTokenPriceFromCoingecko = getTokenPriceFromCoingecko;
