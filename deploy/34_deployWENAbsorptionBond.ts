import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { ifNotProd, log } from "../packages/utils/utils";
import {
    AllocatedRiskFreeValue__factory,
    WenAbsorptionBondDepository__factory,
    WOHM__factory,
} from "../packages/sdk/typechain";

import { WOHM_DID } from "./17_deployWOHM";

export const WEN_ABSORPTION_BOND = "wen_absorption_bond";

const deployWenAbsorptionBond: IExtendedDeployFunction<IExodiaContractsRegistry> =
    async ({ deploy, get, getNamedAccounts }: IExtendedHRE<IExodiaContractsRegistry>) => {
        const { contract: wsexod } = await get<WOHM__factory>("wOHM");
        const { contract: arfv } = await get<AllocatedRiskFreeValue__factory>(
            "AllocatedRiskFreeValue"
        );
        const { DAO } = await getNamedAccounts();
        const WEN = "0x86D7BcCB91B1c5A01A7aD7D7D0eFC7106928c7F8";
        const { contract: bond } = await deploy<WenAbsorptionBondDepository__factory>(
            "WenAbsorptionBondDepository",
            [wsexod.address, WEN, DAO]
        );

        log("WEN absorption bond", bond.address);
    };
export default deployWenAbsorptionBond;
deployWenAbsorptionBond.id = WEN_ABSORPTION_BOND;
deployWenAbsorptionBond.tags = ["local", "test", WEN_ABSORPTION_BOND];
deployWenAbsorptionBond.dependencies = ifNotProd([WOHM_DID]);
