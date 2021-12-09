import { BigNumber } from "ethers";

export const DAI_DECIMALS = 18;
export const OHM_DECIMALS = 9;

export function toWei(qt: number, decimals: number) {
    return String(qt * 10 ** decimals);
}

export function toBN(qt: number, decimals: number) {
    return BigNumber.from(toWei(qt, decimals));
}
