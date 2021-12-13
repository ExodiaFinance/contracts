import { ContractFactory } from "./ContractFactory";
import { contracts, IExodiaContractsRegistry } from "./exodiaContracts";
import { providers } from "./providers";

export const contractFactory = new ContractFactory<IExodiaContractsRegistry>(
    providers,
    contracts
);
