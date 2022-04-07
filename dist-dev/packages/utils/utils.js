"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exec =
    exports.waitTx =
    exports.isProd =
    exports.ifNotProd =
    exports.log =
    exports.toBN =
    exports.toWei =
    exports.ZERO_ADDRESS =
    exports.WOHM_DECIMALS =
    exports.OHM_DECIMALS =
    exports.DAI_DECIMALS =
        void 0;
const ethers_1 = require("ethers");
exports.DAI_DECIMALS = 18;
exports.OHM_DECIMALS = 9;
exports.WOHM_DECIMALS = 18;
exports.ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
function toWei(qt, decimals) {
    return String(qt * 10 ** decimals);
}
exports.toWei = toWei;
function toBN(qt, decimals) {
    return ethers_1.BigNumber.from(toWei(qt, decimals));
}
exports.toBN = toBN;
function log(...args) {
    if (process.env.NODE_ENV !== "test") {
        console.log(args.join(" "));
    }
}
exports.log = log;
function ifNotProd(dependencies) {
    if (process.env.NODE_ENV === "prod") {
        return [];
    }
    return dependencies;
}
exports.ifNotProd = ifNotProd;
function isProd() {
    return process.env.NODE_ENV === "prod";
}
exports.isProd = isProd;
async function waitTx(fn) {
    try {
        const tx = await fn();
        if (isProd()) {
            await tx.wait(4);
        }
    } catch (e) {
        console.log(e);
        return false;
    }
    return true;
}
exports.waitTx = waitTx;
async function exec(fn) {
    let success = false;
    const maxAttempts = 3;
    for (let i = 0; i < maxAttempts && !success; i++) {
        success = await waitTx(fn);
    }
}
exports.exec = exec;
