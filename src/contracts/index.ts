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
    BEETHOVEN_VAULT: "0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce",
    MAI_TOKEN: "0xfb98b335551a418cd0737375a2ea0ded62ea213b",
    FTM_USD_FEED: "0xf4766552D15AE4d256Ad41B6cf2933482B0680dc",
};
externalAddressRegistry.addNetwork(Network.OPERA_MAIN_NET, mainnetRegistry);

externalAddressRegistry.addNetwork(Network.OPERA_TEST_NET, {
    REVEST_REGISTRY: "0xE84103FA5eB600Bf2320a4b38Cd03E63861F0832",
    THE_MONOLITH_POOL: ZERO_ADDRESS,
    BEETHOVEN_VAULT: ZERO_ADDRESS,
    MAI_TOKEN: ZERO_ADDRESS,
    FTM_USD_FEED: "0xe04676B9A9A2973BCb0D1478b5E1E9098BBB7f3D",
});

externalAddressRegistry.addNetwork(Network.HARDHAT, mainnetRegistry);
