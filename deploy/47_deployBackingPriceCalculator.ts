import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../packages/utils/utils";
import { BackingPriceCalculator__factory } from "../packages/sdk/typechain";
import { EXODIA_ROLES_DID } from "./38_deployExodiaRoles";

export const BACKING_PRICE_CALCULATOR_PID = "backing_price_calculator";

const deployBackingPriceCalculator: IExtendedDeployFunction<IExodiaContractsRegistry> =
    async ({ deploy, getNetwork }: IExtendedHRE<IExodiaContractsRegistry>) => {
        const { contract: backingPriceCalculator } =
            await deploy<BackingPriceCalculator__factory>("BackingPriceCalculator", []);
        log("backing price calculator", backingPriceCalculator.address);
    };
export default deployBackingPriceCalculator;
deployBackingPriceCalculator.id = BACKING_PRICE_CALCULATOR_PID;
deployBackingPriceCalculator.tags = ["local", "test", EXODIA_ROLES_DID];
