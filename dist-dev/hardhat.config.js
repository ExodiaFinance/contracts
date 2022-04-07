"use strict";
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-solhint");
require("@nomiclabs/hardhat-waffle");
require("@typechain/hardhat");
require("dotenv/config");
const ethers_1 = require("ethers");
require("hardhat-abi-exporter");
require("hardhat-deploy");
require("solidity-coverage");
// import "hardhat-watcher";
//import "./packages/HardhatRegistryExtension";
const Network_1 = require("./packages/sdk/contracts/Network");
const providers_1 = require("./packages/sdk/contracts/providers");
const FTMSCAN_API_KEY = process.env.FTMSCAN_API_KEY;
const DEPLOYER_SECRET_KEY = process.env.DEPLOYER_SECRET_KEY;
module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            // If you want to do some forking, uncomment this
            forking: {
                url: providers_1.providers.getUrl(Network_1.Network.OPERA_MAIN_NET),
            },
            // blockNumber: 29734853,
        },
        localhost: {},
        ganache: {
            url: "http://localhost:8545",
            accounts: [DEPLOYER_SECRET_KEY],
        },
        ftm_testnet: {
            url: providers_1.providers.getUrl(Network_1.Network.OPERA_TEST_NET),
            chainId: Network_1.Network.OPERA_TEST_NET,
            accounts: [DEPLOYER_SECRET_KEY],
            tags: ["test"],
        },
        ftm_mainnet: {
            url: providers_1.providers.getUrl(Network_1.Network.OPERA_MAIN_NET),
            chainId: Network_1.Network.OPERA_MAIN_NET,
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
            default: 0,
            [Network_1.Network.OPERA_MAIN_NET]:
                ethers_1.ethers.utils.computeAddress(DEPLOYER_SECRET_KEY),
            [Network_1.Network.OPERA_TEST_NET]:
                ethers_1.ethers.utils.computeAddress(DEPLOYER_SECRET_KEY),
        },
        DAO: {
            default: 0,
            [Network_1.Network.OPERA_MAIN_NET]:
                "0xC4e0cbe134c48085e8FF72eb31f0Ebca29b152ee",
            [Network_1.Network.HARDHAT]: "0xC4e0cbe134c48085e8FF72eb31f0Ebca29b152ee",
            [Network_1.Network.OPERA_TEST_NET]:
                "0x723BF24e952ac47C52bB6df19DE16294b027Cd3E",
        },
    },
    solidity: {
        settings: {
            optimizer: {
                enabled: true,
                runs: 500,
            },
        },
        compilers: [
            {
                version: "0.7.5",
            },
            {
                version: "0.8.12",
            },
        ],
        outputSelection: {
            "*": {
                "*": ["storageLayout"],
            },
        },
    },
    xhre: {
        //contractRegistryPath: "../sdk/contracts/exodiaContracts.ts",
    },
    typechain: {
        outDir: "packages/sdk/typechain",
    },
    mocha: {
        timeout: 100000,
    },
};
