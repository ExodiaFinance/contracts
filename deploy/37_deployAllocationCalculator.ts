import { IExodiaContractsRegistry } from "../src/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../src/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../src/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../src/utils";
import { AllocationCalculator__factory } from "../typechain";
export const ALLOCATION_CALCULATOR_DID = "allocation_calculator";

const deployARFVToken: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: allocCalc } = await deploy<AllocationCalculator__factory>(
        "AllocationCalculator",
        []
    );
    log("Allocation Calculator", allocCalc.address);
};
export default deployARFVToken;
deployARFVToken.id = ALLOCATION_CALCULATOR_DID;
deployARFVToken.tags = ["local", "test", ALLOCATION_CALCULATOR_DID];
deployARFVToken.dependencies = [];
