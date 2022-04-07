"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAI_DID = void 0;
const utils_1 = require("../packages/utils/utils");
exports.DAI_DID = "dai_token";
const daiDeployment = async ({ deployments, getNamedAccounts, network }) => {
    const { deployer } = await getNamedAccounts();
    const deployment = await deployments.deploy("DAI", {
        from: deployer,
        args: [network.config.chainId || 31337],
    });
    (0, utils_1.log)("DAI", deployment.address);
};
exports.default = daiDeployment;
daiDeployment.id = exports.DAI_DID;
daiDeployment.tags = ["local", "test", exports.DAI_DID];
