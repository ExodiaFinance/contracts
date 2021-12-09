import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/dist/src/types";
import { DAI, OlympusTreasury } from "../../typechain";

export default async function (
    ethers: HardhatEthersHelpers,
    treasury: OlympusTreasury,
    dai: DAI,
    amount: string,
    profit = "0"
) {
    const [deployer] = await ethers.getSigners();
    await dai.mint(deployer.address, amount);
    await dai.approve(treasury.address, amount);
    await treasury.deposit(amount, dai.address, profit);
}
