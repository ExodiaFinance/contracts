import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../packages/utils/utils";
import { AllocationCalculator__factory } from "../packages/sdk/typechain";
export const ALLOCATION_CALCULATOR_DID = "allocation_calculator";

const deployAllocationCalculator: IExtendedDeployFunction<IExodiaContractsRegistry> =
    async ({ deploy }: IExtendedHRE<IExodiaContractsRegistry>) => {
        const { contract: allocCalc } = await deploy<AllocationCalculator__factory>(
            "AllocationCalculator",
            []
        );
        log("Allocation Calculator", allocCalc.address);
    };
export default deployAllocationCalculator;
deployAllocationCalculator.id = ALLOCATION_CALCULATOR_DID;
deployAllocationCalculator.tags = ["local", "test", ALLOCATION_CALCULATOR_DID];
deployAllocationCalculator.dependencies = [];
