import { ZERO_ADDRESS } from "../subdeploy/deployBasics";

import { ContractFactory } from "./ContractFactory";
import { NetworksContractsRegistry } from "./contractRegistry";
import {
    contracts,
    IExodiaContractsRegistry,
    IExternalContractsRegistry,
} from "./exodiaContracts";
import { Network } from "./Network";
import { providers } from "./providers";

export const contractFactory = new ContractFactory<IExodiaContractsRegistry>(
    providers,
    contracts
);

export const externalAddressRegistry =
    new NetworksContractsRegistry<IExternalContractsRegistry>();

const mainnetRegistry: IExternalContractsRegistry = {
    REVEST_REGISTRY: "0xe0741aE6a8A6D87A68B7b36973d8740704Fd62B9",
    THE_MONOLITH_POOL: "0xa216AA5d67Ef95DdE66246829c5103C7843d1AAB",
    THE_MONOLITH_POOLID:
        "0xa216aa5d67ef95dde66246829c5103c7843d1aab000100000000000000000112",
    BEETHOVEN_VAULT: "0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce",
    MAI_TOKEN: "0xfb98b335551a418cd0737375a2ea0ded62ea213b",
    FTM_USD_FEED: "0xf4766552D15AE4d256Ad41B6cf2933482B0680dc",
    USDC_USD_FEED: "0x2553f4eeb82d5A26427b8d1106C51499CBa5D99c",
    DAI_USD_FEED: "0x91d5DEFAFfE2854C7D02F50c80FA1fdc8A721e52",
    OHM_USD_FEED: "0xb26867105D25bD127862bEA9B952Fa2E89942837",
    OHM_INDEX_FEED: "0xCeC98f20cCb5c19BB42553D70eBC2515E3B33947",
    SPIRIT_FTM_GOHM: "0xae9BBa22E87866e48ccAcFf0689AFaa41eB94995",
    SPOOKY_MAI_USDC: "0x4de9f0ed95de2461b6db1660f908348c42893b1a",
    SPOOKY_ROUTER: "0xF491e7B69E4244ad4002BC14e878a34207E38c29",
    EXODDAI_LP: "0xC0c1Dff0Fe24108586e11ec9E20a7CbB405CB769",
    GUIQIN_QI_POOLID:
        "0x2c580c6f08044d6dfaca8976a66c8fadddbd9901000000000000000000000038",
};
externalAddressRegistry.addNetwork(Network.OPERA_MAIN_NET, mainnetRegistry);

externalAddressRegistry.addNetwork(Network.OPERA_TEST_NET, {
    REVEST_REGISTRY: "0xE84103FA5eB600Bf2320a4b38Cd03E63861F0832",
    THE_MONOLITH_POOL: ZERO_ADDRESS,
    THE_MONOLITH_POOLID: ZERO_ADDRESS,
    BEETHOVEN_VAULT: ZERO_ADDRESS,
    MAI_TOKEN: ZERO_ADDRESS,
    FTM_USD_FEED: "0xe04676B9A9A2973BCb0D1478b5E1E9098BBB7f3D",
    USDC_USD_FEED: "0x9BB8A6dcD83E36726Cc230a97F1AF8a84ae5F128",
    DAI_USD_FEED: "0x9BB8A6dcD83E36726Cc230a97F1AF8a84ae5F128",
    OHM_USD_FEED: ZERO_ADDRESS,
    OHM_INDEX_FEED: ZERO_ADDRESS,
    SPIRIT_FTM_GOHM: ZERO_ADDRESS,
    SPOOKY_MAI_USDC: ZERO_ADDRESS,
    SPOOKY_ROUTER: ZERO_ADDRESS,
    EXODDAI_LP: ZERO_ADDRESS,
    GUIQIN_QI_POOLID: ZERO_ADDRESS,
});

externalAddressRegistry.addNetwork(Network.HARDHAT, mainnetRegistry);
