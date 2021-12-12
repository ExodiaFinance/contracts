import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/dist/src/types";
import { DAI, OlympusTreasury } from "../../typechain";

export default async function (
    minter: string,
    treasury: OlympusTreasury,
    dai: DAI,
    amount: string,
    profit = "0"
) {
    await dai.mint(minter, amount);
    await dai.approve(treasury.address, amount);
    await treasury.deposit(amount, dai.address, profit);
}
