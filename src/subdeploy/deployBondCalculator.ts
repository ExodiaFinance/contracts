import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/dist/src/types";

import { OlympusBondingCalculator__factory } from "../../typechain";

export default async function deployBondCalculator(
    ethers: HardhatEthersHelpers,
    ohmAddress: string
) {
    const calcFactory =
        await ethers.getContractFactory<OlympusBondingCalculator__factory>(
            "OlympusBondingCalculator"
        );
    return calcFactory.deploy(ohmAddress);
}
