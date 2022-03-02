import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import { IExtendedDeployFunction } from "../packages/HardhatRegistryExtension/ExtendedDeployFunction";
import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { log } from "../packages/utils/utils";
import {
    DAI__factory,
    OlympusERC20Token__factory,
    OlympusTreasury__factory,
} from "../packages/sdk/typechain";
import { DAI_DID } from "./00_deployDai";

import { OHM_DID } from "./01_deployOhm";

export const TREASURY_DID = "treasury";

const treasuryDeployment: IExtendedDeployFunction<IExodiaContractsRegistry> = async ({
    deploy,
    get,
}: IExtendedHRE<IExodiaContractsRegistry>) => {
    const { contract: dai } = await get<DAI__factory>("DAI");
    const { contract: ohm } = await get<OlympusERC20Token__factory>("OlympusERC20Token");
    const { contract, deployment } = await deploy<OlympusTreasury__factory>(
        "OlympusTreasury",
        [ohm.address, dai.address, 0]
    );
    log("Treasury", contract.address);
};
export default treasuryDeployment;
treasuryDeployment.id = TREASURY_DID;
treasuryDeployment.tags = ["local", "test", TREASURY_DID];
treasuryDeployment.dependencies = [OHM_DID, DAI_DID];
