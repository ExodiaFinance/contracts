import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/dist/src/types";
import { OlympusTreasury__factory } from "../../typechain";

export default async function deployTreasury(
    ethers: HardhatEthersHelpers,
    ohmAddress: string,
    daiAddress: string
) {
    const treasuryFactory = await ethers.getContractFactory<OlympusTreasury__factory>(
        "OlympusTreasury"
    );
    return treasuryFactory.deploy(ohmAddress, daiAddress, 0);
}
