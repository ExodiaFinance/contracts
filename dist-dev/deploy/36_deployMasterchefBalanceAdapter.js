"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MASTERCHEF_BALANCE_ADAPTER_DID = void 0;
const contracts_1 = require("../packages/sdk/contracts");
const utils_1 = require("../packages/utils/utils");
exports.MASTERCHEF_BALANCE_ADAPTER_DID = "masterchef_balance";
const deployMasterchefBalanceAdapter = async ({ deploy, getNetwork, get }) => {
    const { THE_MONOLITH_POOL, BEETS_MASTERCHEF, FBEETS_BAR, DEMETER_DEGREE } =
        contracts_1.externalAddressRegistry.forNetwork(await getNetwork());
    const { contract: adapter, deployment } = await deploy(
        "MasterchefBalanceAdapter",
        []
    );
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        const treasuryTracker = await get("TreasuryTracker");
        await (0, utils_1.exec)(() =>
            treasuryTracker.contract.addAdapter(adapter.address)
        );
        await (0, utils_1.exec)(() =>
            adapter.addFarm(THE_MONOLITH_POOL, {
                contractAddress: BEETS_MASTERCHEF,
                pid: 37,
            })
        );
        await (0, utils_1.exec)(() =>
            adapter.addFarm(FBEETS_BAR, {
                contractAddress: BEETS_MASTERCHEF,
                pid: 22,
            })
        );
        await (0, utils_1.exec)(() =>
            adapter.addFarm(DEMETER_DEGREE, {
                contractAddress: BEETS_MASTERCHEF,
                pid: 40,
            })
        );
    }
    (0, utils_1.log)("MasterchefBalanceAdapter ", adapter.address);
};
exports.default = deployMasterchefBalanceAdapter;
deployMasterchefBalanceAdapter.id = exports.MASTERCHEF_BALANCE_ADAPTER_DID;
deployMasterchefBalanceAdapter.tags = [
    "local",
    "test",
    exports.MASTERCHEF_BALANCE_ADAPTER_DID,
];
