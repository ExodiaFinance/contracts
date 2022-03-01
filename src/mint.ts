import { BigNumberish } from "ethers";

import { DAI, OlympusTreasury } from "../typechain";

import toggleRights, { MANAGING } from "./toggleRights";

export default async function (
    minter: string,
    treasury: OlympusTreasury,
    dai: DAI,
    amount: BigNumberish,
    profit = "0"
) {
    if (!(await treasury.isReserveDepositor(minter))) {
        await toggleRights(treasury, MANAGING.RESERVEDEPOSITOR, minter);
    }
    await dai.mint(minter, amount);
    await dai.approve(treasury.address, amount);
    await treasury.deposit(amount, dai.address, profit);
}
