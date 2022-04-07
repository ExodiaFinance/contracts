"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MANAGING = void 0;
const utils_1 = require("./utils");
var MANAGING;
(function (MANAGING) {
    MANAGING[(MANAGING["RESERVEDEPOSITOR"] = 0)] = "RESERVEDEPOSITOR";
    MANAGING[(MANAGING["RESERVESPENDER"] = 1)] = "RESERVESPENDER";
    MANAGING[(MANAGING["RESERVETOKEN"] = 2)] = "RESERVETOKEN";
    MANAGING[(MANAGING["RESERVEMANAGER"] = 3)] = "RESERVEMANAGER";
    MANAGING[(MANAGING["LIQUIDITYDEPOSITOR"] = 4)] = "LIQUIDITYDEPOSITOR";
    MANAGING[(MANAGING["LIQUIDITYTOKEN"] = 5)] = "LIQUIDITYTOKEN";
    MANAGING[(MANAGING["LIQUIDITYMANAGER"] = 6)] = "LIQUIDITYMANAGER";
    MANAGING[(MANAGING["DEBTOR"] = 7)] = "DEBTOR";
    MANAGING[(MANAGING["REWARDMANAGER"] = 8)] = "REWARDMANAGER";
    MANAGING[(MANAGING["SOHM"] = 9)] = "SOHM";
})((MANAGING = exports.MANAGING || (exports.MANAGING = {})));
async function toggleRights(
    treasury,
    managing,
    address,
    calculator = utils_1.ZERO_ADDRESS
) {
    await treasury.queue(managing, address);
    return treasury.toggle(managing, address, calculator);
}
exports.default = toggleRights;
