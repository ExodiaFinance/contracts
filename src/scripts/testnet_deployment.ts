import { ethers } from "hardhat";

import deployBasics from "../subdeploy/deployBasics";
import deployDai from "../subdeploy/deployDai";
import mint from "../mint";
import { DAI_DECIMALS, toWei } from "../utils";

async function main() {
    const [deployer] = await ethers.getSigners();
    const { chainId, name } = await ethers.getDefaultProvider().getNetwork();
    console.log(`Deploying to ${name} (${chainId})`);
    const dai = await deployDai(ethers, chainId);
    logContract(dai);
    await dai.mint(deployer.address, toWei(100, DAI_DECIMALS));
    const deployment = await deployBasics(ethers, dai.address);
    logContract(deployment.ohm);
    logContract(deployment.sohm);
    logContract(deployment.treasury);
    logContract(deployment.bondCalculator);
    logContract(deployment.redeemHelper);
    logContract(deployment.staking);
    logContract(deployment.stakingHelper);
    logContract(deployment.distributor);
    logContract(deployment.warmup);
    await mint(ethers, deployment.treasury, dai, toWei(2000, DAI_DECIMALS));
}

function logContract(contract: any) {
    console.log(`${contract.constructor.name} deployed at ${contract.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
