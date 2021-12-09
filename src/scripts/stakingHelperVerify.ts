import { contractFactory } from "../contracts";
import { Network } from "../contracts/Network";

const chainId = Network.OPERA_MAIN_NET;
const staking = contractFactory.forNetwork(chainId).getLatestContract("Staking");
const ohm = contractFactory.forNetwork(chainId).getLatestContract("EXOD");

export default [staking.address, ohm.address];
