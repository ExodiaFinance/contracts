"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FNFT_MASTER_LOCK_DID = void 0;
const contracts_1 = require("../packages/sdk/contracts");
const utils_1 = require("../packages/utils/utils");
exports.FNFT_MASTER_LOCK_DID = "liquid_lock_staking";
const deployFNFTMasterLock = async ({ deploy, getNetwork }) => {
    const { REVEST_REGISTRY } = contracts_1.externalAddressRegistry.forNetwork(
        await getNetwork()
    );
    const { contract: masterLock } = await deploy("MasterLock", [REVEST_REGISTRY]);
    (0, utils_1.log)("MasterLock:", masterLock.address);
};
exports.default = deployFNFTMasterLock;
deployFNFTMasterLock.id = exports.FNFT_MASTER_LOCK_DID;
deployFNFTMasterLock.tags = ["local", "test", exports.FNFT_MASTER_LOCK_DID];
