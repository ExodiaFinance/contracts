"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOLIDEX_BALANCE_ADAPTER_DID = void 0;
const sdk_1 = require("../packages/sdk");
const utils_1 = require("../packages/utils/utils");
exports.SOLIDEX_BALANCE_ADAPTER_DID = "solidex_balance_adapter";
const deploySexAdapter = async ({ deploy, get, getNetwork }) => {
    const { SOLIDEX_LP_DEPOSITOR } = sdk_1.externalAddressRegistry.forNetwork(
        await getNetwork()
    );
    const { contract: sexAdapter, deployment } = await deploy("SolidexBalanceAdapter", [
        SOLIDEX_LP_DEPOSITOR,
    ]);
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        const { contract: tracker } = await get("TreasuryTracker");
        await (0, utils_1.exec)(() => tracker.addAdapter(sexAdapter.address));
    }
    (0, utils_1.log)("Solidex balance adapter", sexAdapter.address);
};
exports.default = deploySexAdapter;
deploySexAdapter.id = exports.SOLIDEX_BALANCE_ADAPTER_DID;
deploySexAdapter.tags = ["local", "test", exports.SOLIDEX_BALANCE_ADAPTER_DID];
