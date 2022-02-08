import { SOR, SwapTypes } from "@balancer-labs/sor";
import { BaseProvider } from "@ethersproject/providers";
import { ethers } from "ethers";
import hre from "hardhat";

import { IExodiaContractsRegistry } from "../../src/contracts/exodiaContracts";
import { Network } from "../../src/contracts/Network";
import { IExtendedHRE } from "../../src/HardhatRegistryExtension/ExtendedHRE";
import { EWBalSpotPriceOracle, EWBalSpotPriceOracle__factory } from "../../typechain";

const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, getNamedAccounts, deploy } = xhre;

export const WBTC_ADDRESS = "0x321162Cd933E2Be498Cd2267a90534A804051b11";
export const USDC_ADDRESS = "0x04068da6c83afcfa0e13ba15a6696662335d5b75";
export const BEETHOVEN_SUBGRAPH =
    "https://graph-node.beets-ftm-node.com/subgraphs/name/beethovenx";
export const BEETHOVEN_VAULT = "0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce";
export const A_LATE_QUARTET =
    "0xf3a602d30dcb723a74a0198313a7551feaca7dac00010000000000000000005f";

describe("Beethoven X interactions", function () {
    let deployer: string;
    let sor: SOR;
    let oracle: EWBalSpotPriceOracle;

    beforeEach(async function () {
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
        const provider = xhre.ethers.provider as BaseProvider;
        // @ts-ignore
        sor = new SOR(provider, Network.OPERA_MAIN_NET, BEETHOVEN_SUBGRAPH);
        const oracleDeployment = await deployments.deploy("EWBalSpotPriceOracle", {
            args: [WBTC_ADDRESS, USDC_ADDRESS],
            from: deployer,
        });
        const signer = await xhre.ethers.getSigner(deployer);
        oracle = EWBalSpotPriceOracle__factory.connect(oracleDeployment.address, signer);
        await oracle.updatePool(BEETHOVEN_VAULT, A_LATE_QUARTET, 2, 0);
    });

    it("Should get the price from the sor", async function () {
        const info = await sor.getSwaps(
            USDC_ADDRESS,
            WBTC_ADDRESS,
            SwapTypes.SwapExactOut,
            ethers.utils.parseUnits("1", "ether")
        );
        console.log('@@@', info);
    });

    it("Should get the price from the pool balance", async function () {
        const price = await oracle.getPrice();
        console.log(price.toString());
    });
});
