"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GOHM_BOND_SET_STAKING_DID = void 0;
const utils_1 = require("../packages/utils/utils");
const _07_deployStakingHelper_1 = require("./07_deployStakingHelper");
const _22_deployGOHMBonds_1 = require("./22_deployGOHMBonds");
exports.GOHM_BOND_SET_STAKING_DID = "dai_bond_set_staking";
const setStakingGOHMBond = async ({ get }) => {
    const { contract: stakingHelper } = await get("StakingHelperV2");
    const { contract: bond } = await get("GOHMBondDepository");
    const bondStakingHelperAddress = await bond.stakingHelper();
    if (stakingHelper.address !== bondStakingHelperAddress) {
        await bond.setStaking(stakingHelper.address, true);
        (0, utils_1.log)(
            "gohm bond StakingHelper address updated:",
            bondStakingHelperAddress,
            " -> ",
            stakingHelper.address
        );
    }
};
exports.default = setStakingGOHMBond;
setStakingGOHMBond.id = exports.GOHM_BOND_SET_STAKING_DID;
setStakingGOHMBond.tags = ["local", "test", exports.GOHM_BOND_SET_STAKING_DID];
setStakingGOHMBond.dependencies = [
    _07_deployStakingHelper_1.STAKING_HELPER_DID,
    _22_deployGOHMBonds_1.GOHM_BOND_DID,
];
