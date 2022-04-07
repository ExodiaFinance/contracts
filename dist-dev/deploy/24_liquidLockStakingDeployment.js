"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIQUID_LOCK_STAKING_DID = void 0;
const contracts_1 = require("../packages/sdk/contracts");
const utils_1 = require("../packages/utils/utils");
const _17_deployWOHM_1 = require("./17_deployWOHM");
const _28_deployFNFTMasterLock_1 = require("./28_deployFNFTMasterLock");
exports.LIQUID_LOCK_STAKING_DID = "liquid_lock_staking";
const liquidLockStakingDeployment = async ({ get, deploy, getNetwork }) => {
    const { contract: wohm } = await get("wOHM");
    const { contract: masterLock } = await get("MasterLock");
    const { contract: rewardHandler } = await deploy("LLSRewardHandler", [wohm.address]);
    const { REVEST_REGISTRY } = contracts_1.externalAddressRegistry.forNetwork(
        await getNetwork()
    );
    const { contract: staking, deployment } = await deploy("LiquidLockStaking", [
        wohm.address,
        rewardHandler.address,
        REVEST_REGISTRY,
        masterLock.address,
    ]);
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        await rewardHandler.setStakingContract(staking.address);
    }
    (0, utils_1.log)("Liquid Lock Staking:", staking.address);
    (0, utils_1.log)("Lock staking reward handler", rewardHandler.address);
};
exports.default = liquidLockStakingDeployment;
liquidLockStakingDeployment.id = exports.LIQUID_LOCK_STAKING_DID;
liquidLockStakingDeployment.tags = ["local", "test", exports.LIQUID_LOCK_STAKING_DID];
liquidLockStakingDeployment.dependencies = [
    _17_deployWOHM_1.WOHM_DID,
    _28_deployFNFTMasterLock_1.FNFT_MASTER_LOCK_DID,
];
