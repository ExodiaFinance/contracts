"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAI_BOND_SET_STAKING_DID = void 0;
const utils_1 = require("../packages/utils/utils");
const _07_deployStakingHelper_1 = require("./07_deployStakingHelper");
const _11_deployDaiBond_1 = require("./11_deployDaiBond");
exports.DAI_BOND_SET_STAKING_DID = "dai_bond_set_staking";
const setStakingDaiBond = async ({ get }) => {
    const { contract: stakingHelper } = await get("StakingHelperV2");
    const { contract: bond } = await get("DAIBondDepository");
    const bondStakingHelperAddress = await bond.stakingHelper();
    if (stakingHelper.address !== bondStakingHelperAddress) {
        await bond.setStaking(stakingHelper.address, true);
        (0, utils_1.log)(
            "Dai bond StakingHelper address updated:",
            bondStakingHelperAddress,
            " -> ",
            stakingHelper.address
        );
    }
};
exports.default = setStakingDaiBond;
setStakingDaiBond.id = exports.DAI_BOND_SET_STAKING_DID;
setStakingDaiBond.tags = ["local", "test", exports.DAI_BOND_SET_STAKING_DID];
setStakingDaiBond.dependencies = [
    _07_deployStakingHelper_1.STAKING_HELPER_DID,
    _11_deployDaiBond_1.DAI_BOND_DID,
];
