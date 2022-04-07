"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OHM_CIRCULATING_SUPPLY_DID = void 0;
const utils_1 = require("../packages/utils/utils");
const _01_deployOhm_1 = require("./01_deployOhm");
exports.OHM_CIRCULATING_SUPPLY_DID = "ohm_circulating_supply";
const ohmCirculatingSupplyDeployment = async ({ deploy, getNamedAccounts, get }) => {
    const { deployer } = await getNamedAccounts();
    const { contract: ohm } = await get("OlympusERC20Token");
    const { contract, deployment } = await deploy("OHMCirculatingSupplyContract", [
        deployer,
    ]);
    if (
        deployment === null || deployment === void 0 ? void 0 : deployment.newlyDeployed
    ) {
        await contract.initialize(ohm.address);
    }
    (0, utils_1.log)("OHMCirculatinSupply", contract.address);
};
exports.default = ohmCirculatingSupplyDeployment;
ohmCirculatingSupplyDeployment.id = exports.OHM_CIRCULATING_SUPPLY_DID;
ohmCirculatingSupplyDeployment.tags = [
    "local",
    "test",
    exports.OHM_CIRCULATING_SUPPLY_DID,
];
ohmCirculatingSupplyDeployment.dependencies = [_01_deployOhm_1.OHM_DID];
