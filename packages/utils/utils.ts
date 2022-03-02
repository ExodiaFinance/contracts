import { BigNumber, ContractTransaction } from "ethers";

export const DAI_DECIMALS = 18;
export const OHM_DECIMALS = 9;
export const WOHM_DECIMALS = 18;

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function toWei(qt: number, decimals: number) {
    return String(qt * 10 ** decimals);
}

export function toBN(qt: number, decimals: number) {
    return BigNumber.from(toWei(qt, decimals));
}

export function log(...args: string[]) {
    if (process.env.NODE_ENV !== "test") {
        console.log(args.join(" "));
    }
}

export function ifNotProd(dependencies: string[]) {
    if (process.env.NODE_ENV === "prod") {
        return [];
    }
    return dependencies;
}

export function isProd() {
    return process.env.NODE_ENV === "prod";
}

export async function waitTx(fn: () => Promise<ContractTransaction>) {
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

export async function exec(fn: () => Promise<ContractTransaction>) {
    let success = false;
    const maxAttempts = 3;
    for (let i = 0; i < maxAttempts && !success; i++) {
        success = await waitTx(fn);
    }
}
