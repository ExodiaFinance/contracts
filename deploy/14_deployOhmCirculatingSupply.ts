import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../packages/utils/utils";
import {
    OHMCirculatingSupplyContract__factory,
    OlympusERC20Token__factory,
} from "../packages/sdk/typechain";

import { OHM_DID } from "./01_deployOhm";

export const OHM_CIRCULATING_SUPPLY_DID = "ohm_circulating_supply";

const ohmCirculatingSupplyDeployment: IExtendedDeployFunction<IExodiaContractsRegistry> =
    async ({ deploy, getNamedAccounts, get }: IExtendedHRE<IExodiaContractsRegistry>) => {
        const { deployer } = await getNamedAccounts();
        const { contract: ohm } = await get<OlympusERC20Token__factory>(
            "OlympusERC20Token"
        );
        const { contract, deployment } =
            await deploy<OHMCirculatingSupplyContract__factory>(
                "OHMCirculatingSupplyContract",
                [deployer]
            );
        if (deployment?.newlyDeployed) {
            await contract.initialize(ohm.address);
        }
        log("OHMCirculatinSupply", contract.address);
    };
export default ohmCirculatingSupplyDeployment;
ohmCirculatingSupplyDeployment.id = OHM_CIRCULATING_SUPPLY_DID;
ohmCirculatingSupplyDeployment.tags = ["local", "test", OHM_CIRCULATING_SUPPLY_DID];
ohmCirculatingSupplyDeployment.dependencies = [OHM_DID];
