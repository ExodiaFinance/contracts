"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contracts = void 0;
const typechain_1 = require("../typechain");
const contractRegistry_1 = require("./contractRegistry");
const Network_1 = require("./Network");
exports.contracts = new contractRegistry_1.NetworksContractsRegistry();
const mainOperaContract = {
    OlympusERC20Token: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.OlympusERC20Token__factory.connect,
            "0x3b57f3feaaf1e8254ec680275ee6e7727c7413c7"
        ),
    ]),
    sOlympus: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.SOlympus__factory.connect,
            "0x8de250c65636ef02a75e4999890c91cecd38d03d"
        ),
    ]),
    OHMCirculatingSupplyContract: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.OHMCirculatingSupplyContract__factory.connect,
            "0x571ef9199c3559d2450d509a4bda1127f729d205"
        ),
    ]),
    OlympusStaking: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.OlympusStaking__factory.connect,
            "0x8b8d40f98a2f14E2dD972b3f2E2a2CC227d1E3Be"
        ),
    ]),
    DAI: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.DAI__factory.connect,
            "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e"
        ),
    ]),
    OlympusTreasury: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.OlympusTreasury__factory.connect,
            "0x6A654D988eEBCD9FfB48ECd5AF9Bd79e090D8347"
        ),
    ]),
    StakingWarmup: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.StakingWarmup__factory.connect,
            "0xFb14cce5f6951e6c0935927C00a01FC57ed65920"
        ),
    ]),
    StakingHelper: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.StakingHelper__factory.connect,
            "0x43CdFC01C2DEF98C595b28E72b58D2575AA05E9B"
        ),
    ]),
    StakingHelperV2: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.StakingHelperV2__factory.connect,
            "0x19c027fA2dFA8a9aAD43f36e1ff2B06B2b8e2bf3"
        ),
    ]),
    Distributor: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.Distributor__factory.connect,
            "0xd8DA31efE8d83A8ae511D858A93524F14e66dd80"
        ),
    ]),
    OlympusBondingCalculator: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.OlympusBondingCalculator__factory.connect,
            "0x01884c8FBA9E2C510093d2af308e7a8bA7060b8F"
        ),
    ]),
    RedeemHelper: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.RedeemHelper__factory.connect,
            "0x9d1530475b6282Bd92da5628E36052f70C56A208"
        ),
    ]),
    DAIBondDepository: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.OlympusBondDepository__factory.connect,
            "0xC43Db16Ed7b57597170b76D3afF29708bc608483"
        ),
    ]),
    wOHM: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.WOHM__factory.connect,
            "0xe992C5Abddb05d86095B18a158251834D616f0D1"
        ),
    ]),
    RemoveUniLp: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.RemoveUniLp__factory.connect,
            "0xde88F5f28771B84512d3B355a1C9065B3586dA1c"
        ),
    ]),
    GOHMPriceOracle: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.GOHMPriceOracle__factory.connect,
            "0x9F5334D70038B328eaE3fEf36Ba979Ba3390bf18"
        ),
    ]),
    GOHMBondDepository: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.GOHMBondDepository__factory.connect,
            "0xcf69Ba319fF0F8e2481dE13d16CE7f74b063533E"
        ),
    ]),
    MasterLock: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.MasterLock__factory.connect),
    ]),
    LiquidLockStaking: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.LiquidLockStaking__factory.connect),
    ]),
    LLSRewardHandler: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.LLSRewardHandler__factory.connect),
    ]),
    BPTMNLTPriceOracle: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.BPTPriceOracleV2__factory.connect,
            "0x982a5A71C411f2eF748C91DC97D60C07E1016d4e"
        ),
    ]),
    BPTMNLTBondDepository: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.BPTMNLTBondDepository__factory.connect,
            "0x86E21dB31c154aE777e0C126999e89Df0C01D9Fa"
        ),
        (0, contractRegistry_1.version)(
            typechain_1.BPTMNLTBondDepository__factory.connect,
            "0x18c01a517ED7216b52A4160c12bf814210477Ef2",
            28878457
        ),
    ]),
    fBEETSPriceOracle: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.FBEETSPriceOracle__factory.connect,
            "0xB90Fc1e595C19d84eAeC802f95d32619bB2dE7A0"
        ),
    ]),
    fBEETSBondDepository: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.FBEETSBondDepository__factory.connect,
            "0xe2eA15E992455972Ae11De0a543C48DbeAb9E5Ce"
        ),
    ]),
    AssetAllocator: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.AssetAllocator__factory.connect),
    ]),
    AllocatedRiskFreeValue: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.AllocatedRiskFreeValue__factory.connect,
            "0x4907918C64197B7C96437d831CA9fD264B8a7A8F"
        ),
    ]),
    wFTMBondDepository: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.WFTMBondDepository__factory.connect,
            "0xd7cbA20A464C10FB03Bbc265D962ADa8e29af118"
        ),
        (0, contractRegistry_1.version)(
            typechain_1.WFTMBondDepository__factory.connect,
            "0x39086c3E5979d6F0aB0a54e3135D6e3eDD53c395",
            29523359
        ),
    ]),
    WenAbsorptionBondDepository: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.WenAbsorptionBondDepository__factory.connect,
            "0xf74c60fCa30BFbff0d99D5BFcba3A3fCEa8C47FB"
        ),
    ]),
    TreasuryTracker: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.TreasuryTracker__factory.connect,
            "0x68f30FEd7a9132832d93fAE18dE717D6533edF97"
        ),
    ]),
    BackingPriceCalculator: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.BackingPriceCalculator__factory.connect
        ),
    ]),
    MasterchefBalanceAdapter: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.MasterchefBalanceAdapter__factory.connect,
            "0x853ab5f4678e7f6de4a717f1ca1b48f4893d120c"
        ),
    ]),
    AllocationCalculator: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.AllocationCalculator__factory.connect
        ),
    ]),
    ExodiaRoles: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.ExodiaRoles__factory.connect,
            "0x55d5f1cc07d7d78ba0396d862e9847622113fccf"
        ),
    ]),
    TreasuryManager: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.TreasuryManager__factory.connect),
    ]),
    TreasuryDepositor: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.TreasuryDepositor__factory.connect),
    ]),
    BalancerV2PriceOracle: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.ChainlinkPriceOracle__factory.connect,
            "0x2E4C44F8cd770879BcE0A6C9ced1C4fd2031a577"
        ),
    ]),
    ChainlinkPriceOracle: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.ChainlinkPriceOracle__factory.connect,
            "0xCc333Cd6Bd7344cC0efE9BFc88cF9e5E92b397eA"
        ),
    ]),
    UniswapV2LPPriceOracle: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.UniswapV2LPPriceOracle__factory.connect
        ),
    ]),
    PriceProvider: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.PriceProvider__factory.connect,
            "0x34F7242A95ba97FBc7208f1942789eadBc596D7c"
        ),
    ]),
    Farmer: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.Farmer__factory.connect),
    ]),
    ExodiaBalanceAggregator: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.ExodiaBalanceAggregator__factory.connect,
            "0xa3Cbd851460477C7b7aAA381da7ee4043462657F"
        ),
    ]),
    SolidexBalanceAdapter: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.SolidexBalanceAdapter__factory.connect
        ),
    ]),
    PNLTracker: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.PNLTracker__factory.connect),
    ]),
    StrategyWhitelist: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.StrategyWhitelist__factory.connect),
    ]),
    SolidlyTWAPOracle: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.SolidlyTWAPOracle__factory.connect),
    ]),
};
const testNetOperaContract = {
    OlympusERC20Token: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.OlympusERC20Token__factory.connect,
            "0xD5A6853d76D39597D3B29ec66811f8246b78bA0b"
        ),
    ]),
    sOlympus: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.SOlympus__factory.connect,
            "0x055B72A75c77a27d576f47A0821DBD198EBafdc3"
        ),
    ]),
    OHMCirculatingSupplyContract: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.OHMCirculatingSupplyContract__factory.connect,
            "0x3fB1B92239835F0413E028f591A7AF1a4D02a03c"
        ),
    ]),
    OlympusStaking: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.OlympusStaking__factory.connect,
            "0xD107b5E9cFCb4FD3aae8D139C814F19ed2547940"
        ),
    ]),
    DAI: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.DAI__factory.connect,
            "0xEF6834b5a29D75a883406B19f3eEefbF87b5031A"
        ),
    ]),
    OlympusTreasury: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.OlympusTreasury__factory.connect,
            "0x1d2ec2C0c375a38C78e4342e8F6A730201CCEb41"
        ),
    ]),
    StakingWarmup: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.StakingWarmup__factory.connect,
            "0xA5119B6d5456611a4Ac0ceaa1e667139C490CDD9"
        ),
    ]),
    StakingHelper: new contractRegistry_1.ContractVersions([]),
    StakingHelperV2: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.StakingHelperV2__factory.connect,
            "0xb514E20e244812380996a57ba0daE0F60fc2Ff5f"
        ),
    ]),
    Distributor: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.Distributor__factory.connect,
            "0xAF10E46D8bd5DF0234CAc8fECE2FF9438301ccB5"
        ),
    ]),
    OlympusBondingCalculator: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.OlympusBondingCalculator__factory.connect,
            "0x5f2CfF691065eAf57Edf90B660BA007A956AFd56"
        ),
    ]),
    RedeemHelper: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.RedeemHelper__factory.connect,
            "0x9bb05525A05A121dE0508408E26adc208beD3888"
        ),
    ]),
    DAIBondDepository: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.OlympusBondDepository__factory.connect,
            "0x1B6F86BC319e3B363aC5299c045Ae29D95d7A623"
        ),
    ]),
    wOHM: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.WOHM__factory.connect,
            "0x133f6D7d457377bfA6a43933127498fA40ef11CF"
        ),
    ]),
    RemoveUniLp: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.RemoveUniLp__factory.connect),
    ]),
    GOHMPriceOracle: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.GOHMPriceOracle__factory.connect),
    ]),
    GOHMBondDepository: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.GOHMBondDepository__factory.connect),
    ]),
    MasterLock: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.MasterLock__factory.connect),
    ]),
    LiquidLockStaking: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.LiquidLockStaking__factory.connect),
    ]),
    LLSRewardHandler: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.LLSRewardHandler__factory.connect),
    ]),
    BPTMNLTPriceOracle: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.BPTPriceOracleV2__factory.connect),
    ]),
    BPTMNLTBondDepository: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.BPTMNLTBondDepository__factory.connect
        ),
    ]),
    fBEETSPriceOracle: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.FBEETSPriceOracle__factory.connect),
    ]),
    fBEETSBondDepository: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.FBEETSBondDepository__factory.connect
        ),
    ]),
    AssetAllocator: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.AssetAllocator__factory.connect),
    ]),
    AllocatedRiskFreeValue: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.AllocatedRiskFreeValue__factory.connect
        ),
    ]),
    wFTMBondDepository: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.WFTMBondDepository__factory.connect),
    ]),
    WenAbsorptionBondDepository: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.WenAbsorptionBondDepository__factory.connect
        ),
    ]),
    TreasuryTracker: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.TreasuryTracker__factory.connect),
    ]),
    BackingPriceCalculator: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.BackingPriceCalculator__factory.connect
        ),
    ]),
    MasterchefBalanceAdapter: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.MasterchefBalanceAdapter__factory.connect
        ),
    ]),
    AllocationCalculator: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.AllocationCalculator__factory.connect
        ),
    ]),
    ExodiaRoles: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.ExodiaRoles__factory.connect),
    ]),
    TreasuryManager: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.TreasuryManager__factory.connect),
    ]),
    TreasuryDepositor: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.TreasuryDepositor__factory.connect),
    ]),
    BalancerV2PriceOracle: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.ChainlinkPriceOracle__factory.connect
        ),
    ]),
    ChainlinkPriceOracle: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.ChainlinkPriceOracle__factory.connect
        ),
    ]),
    UniswapV2LPPriceOracle: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.UniswapV2LPPriceOracle__factory.connect
        ),
    ]),
    PriceProvider: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.PriceProvider__factory.connect),
    ]),
    Farmer: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.Farmer__factory.connect),
    ]),
    ExodiaBalanceAggregator: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.ExodiaBalanceAggregator__factory.connect
        ),
    ]),
    SolidexBalanceAdapter: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(
            typechain_1.SolidexBalanceAdapter__factory.connect
        ),
    ]),
    PNLTracker: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.PNLTracker__factory.connect),
    ]),
    StrategyWhitelist: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.StrategyWhitelist__factory.connect),
    ]),
    SolidlyTWAPOracle: new contractRegistry_1.ContractVersions([
        (0, contractRegistry_1.version)(typechain_1.SolidlyTWAPOracle__factory.connect),
    ]),
};
exports.contracts.addNetwork(Network_1.Network.OPERA_MAIN_NET, mainOperaContract);
exports.contracts.addNetwork(Network_1.Network.OPERA_TEST_NET, testNetOperaContract);
