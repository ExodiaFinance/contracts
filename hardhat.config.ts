/**
 * @type import('hardhat/config').HardhatUserConfig
 */

import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-solhint";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "dotenv/config";
import { ethers } from "ethers";
import "hardhat-abi-exporter";
import "hardhat-deploy";
import "solidity-coverage";

// import "hardhat-watcher";
import "./packages/HardhatRegistryExtension";
import { Network } from "./packages/sdk/contracts/Network";
import { providers } from "./packages/sdk/contracts/providers";

const FTMSCAN_API_KEY = process.env.FTMSCAN_API_KEY as string;
const DEPLOYER_SECRET_KEY = process.env.DEPLOYER_SECRET_KEY as string;

module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            // If you want to do some forking, uncomment this
            /* forking: {
                url: providers.getUrl(Network.OPERA_MAIN_NET),
            },*/
            // blockNumber: 29734853,
        },
        localhost: {},
        ganache: {
            url: "http://localhost:8545",
            accounts: [DEPLOYER_SECRET_KEY],
        },
        ftm_testnet: {
            url: providers.getUrl(Network.OPERA_TEST_NET),
            chainId: Network.OPERA_TEST_NET,
            accounts: [DEPLOYER_SECRET_KEY],
            tags: ["test"],
        },
        ftm_mainnet: {
            url: providers.getUrl(Network.OPERA_MAIN_NET),
            chainId: Network.OPERA_MAIN_NET,
            accounts: [DEPLOYER_SECRET_KEY],
            tags: ["main"],
        },
    },
    etherscan: {
        // Your API key for Etherscan
        // Obtain one at https://etherscan.io/
        apiKey: FTMSCAN_API_KEY,
    },
    namedAccounts: {
        deployer: {
            default: 0, // here this will by default take the first account as deployer
            [Network.OPERA_MAIN_NET]: ethers.utils.computeAddress(DEPLOYER_SECRET_KEY),
            [Network.OPERA_TEST_NET]: ethers.utils.computeAddress(DEPLOYER_SECRET_KEY),
        },
        DAO: {
            default: 0,
            [Network.OPERA_MAIN_NET]: "0xC4e0cbe134c48085e8FF72eb31f0Ebca29b152ee",
            [Network.HARDHAT]: "0xC4e0cbe134c48085e8FF72eb31f0Ebca29b152ee",
            [Network.OPERA_TEST_NET]: "0x723BF24e952ac47C52bB6df19DE16294b027Cd3E",
        },
    },
    solidity: {
        compilers: [
            {
                version: "0.7.5",
            },
            {
                version: "0.8.0",
            },
            {
                version: "0.8.10",
            },
        ],
        outputSelection: {
            "*": {
                "*": ["storageLayout"],
            },
        },
    },
    xhre: {
        contractRegistryPath: "../sdk/contracts/exodiaContracts.ts",
    },
    typechain: {
        outDir: "packages/sdk/typechain",
    },
    mocha: {
        timeout: 100000,
    },
};
