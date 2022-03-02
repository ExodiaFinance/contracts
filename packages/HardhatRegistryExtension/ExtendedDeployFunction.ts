import { HardhatRuntimeEnvironment } from "hardhat/types";

import { IExtendedHRE } from "./ExtendedHRE";

export interface IExtendedDeployFunction<T> {
    (env: IExtendedHRE<T>): Promise<void | boolean>;
    skip?: (env: HardhatRuntimeEnvironment) => Promise<boolean>;
    tags?: string[];
    dependencies?: string[];
    runAtTheEnd?: boolean;
    id?: string;
}
