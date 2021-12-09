import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/dist/src/types";

import { DAI__factory } from "../../typechain";

export default async function deployReserveAsset(
    ethers: HardhatEthersHelpers,
    chainId: number
) {
    const DAI = await ethers.getContractFactory<DAI__factory>("DAI");
    return DAI.deploy(chainId);
}
