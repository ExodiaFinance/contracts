import { ethers } from "hardhat";

import { contractFactory } from "../contracts";
import { Network } from "../contracts/Network";
import deployStakingHelper from "../subdeploy/deployStakingHelper";

async function main() {
    const chainId = Network.OPERA_MAIN_NET;
    const staking = contractFactory.forNetwork(chainId).getLatestContract("Staking");
    const ohm = contractFactory.forNetwork(chainId).getLatestContract("EXOD");
    if (staking && ohm) {
        const stakingHelper = await deployStakingHelper(
            ethers,
            staking.address,
            ohm.address
        );
        console.log("Helper deployed to to:", stakingHelper.address);
    } else {
        console.log("Dependencies are not deployed");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
