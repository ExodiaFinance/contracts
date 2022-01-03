import hre from "hardhat";

import { IExodiaContractsRegistry } from "../../src/contracts/exodiaContracts";
import { IExtendedHRE } from "../../src/HardhatRegistryExtension/ExtendedHRE";
import { BPTPriceOracle, BPTPriceOracle__factory } from "../../typechain";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, deploy } = xhre;

export const WBTC_ADDRESS = "0x321162Cd933E2Be498Cd2267a90534A804051b11";
export const USDC_ADDRESS = "0x04068da6c83afcfa0e13ba15a6696662335d5b75";
export const BEETHOVEN_SUBGRAPH =
    "https://graph-node.beets-ftm-node.com/subgraphs/name/beethovenx";
export const BEETHOVEN_VAULT = "0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce";
export const A_LATE_QUARTET =
    "0xf3a602d30dcb723a74a0198313a7551feaca7dac00010000000000000000005f";

describe("Beethoven X BPT oracle", function () {
    let deployer: string;
    let oracle: BPTPriceOracle;

    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
        const oracleDeployment = await deployments.deploy("BPTPriceOracle", {
            args: [USDC_ADDRESS],
            from: deployer,
        });
        const signer = await xhre.ethers.getSigner(deployer);
        oracle = BPTPriceOracle__factory.connect(oracleDeployment.address, signer);
        await oracle.setup(BEETHOVEN_VAULT, A_LATE_QUARTET, 0, 25);
    });

    it("Should get the price of 1 BPT with 8 decimals", async function () {
        const price = await oracle.getPrice();
        console.log(price.toString());
    });
});
