import { OlympusTreasury } from "../../typechain";
import { zeroAddress } from "./deployBasics";

export enum MANAGING {
    RESERVEDEPOSITOR = 0,
    RESERVESPENDER,
    RESERVETOKEN,
    RESERVEMANAGER,
    LIQUIDITYDEPOSITOR,
    LIQUIDITYTOKEN,
    LIQUIDITYMANAGER,
    DEBTOR,
    REWARDMANAGER,
    SOHM,
}

export default async function toggleRights(
    treasury: OlympusTreasury,
    managing: MANAGING,
    address: string,
    calculator = zeroAddress
) {
    await treasury.queue(managing, address);
    await treasury.toggle(managing, address, calculator);
}
