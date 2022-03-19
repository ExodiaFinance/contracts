import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { exec, log } from "../packages/utils/utils";
import {
    AllocationCalculator__factory,
    ExodiaRoles__factory,
} from "../packages/sdk/typechain";
import { EXODIA_ROLES_DID } from "./38_deployExodiaRoles";
export const ALLOCATION_CALCULATOR_DID = "allocation_calculator";

const deployAllocationCalculator: IExtendedDeployFunction<IExodiaContractsRegistry> =
    async ({ deploy, get }: IExtendedHRE<IExodiaContractsRegistry>) => {
        const { contract: allocCalc, deployment } =
            await deploy<AllocationCalculator__factory>("AllocationCalculator", []);
        if (deployment?.newlyDeployed) {
            const { contract: roles } = await get<ExodiaRoles__factory>("ExodiaRoles");
            await exec(() => allocCalc.initialize(roles.address));
        }
        log("Allocation Calculator", allocCalc.address);
    };
export default deployAllocationCalculator;
deployAllocationCalculator.id = ALLOCATION_CALCULATOR_DID;
deployAllocationCalculator.tags = ["local", "test", ALLOCATION_CALCULATOR_DID];
deployAllocationCalculator.dependencies = [EXODIA_ROLES_DID];
