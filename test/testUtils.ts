import { HardhatRuntimeEnvironment } from "hardhat/types";

export const increaseTime = async (
    hre: HardhatRuntimeEnvironment,
    seconds: number,
    blocks = 1
) => {
    await hre.network.provider.request({
        method: "evm_increaseTime",
        params: [seconds],
    });
    await mine(hre, blocks);
};

export const setTimestamp = async (
    hre: HardhatRuntimeEnvironment,
    timestamp: Date,
    blocks = 1
) => {
    await hre.network.provider.request({
        method: "evm_setNextBlockTimestamp",
        params: [timestamp.getTime() / 1000],
    });
    await mine(hre, blocks);
};

export const mine = async (hre: HardhatRuntimeEnvironment, blocks = 1) => {
    for (let i = 0; i < blocks; i++) {
        await hre.network.provider.request({
            method: "evm_mine",
        });
    }
};

export const impersonate = async (hre: HardhatRuntimeEnvironment, address: string) => {
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [address],
    });
    return hre.ethers.getSigner(address);
};
