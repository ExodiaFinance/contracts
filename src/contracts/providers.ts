import { Network } from "./Network";
import { ProvidersRegistry } from "./providersRegistry";

export const providers = new ProvidersRegistry();
providers.addNetwork(Network.OPERA_MAIN_NET, {
    httpRpc: ["https://rpc.ftm.tools"],
});

providers.addNetwork(Network.OPERA_TEST_NET, {
    httpRpc: ["https://rpc.testnet.fantom.network/"],
});
