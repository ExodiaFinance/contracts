import {
    AllocatedRiskFreeValue,
    AllocatedRiskFreeValue__factory,
    AllocationCalculator,
    AllocationCalculator__factory,
    AssetAllocator,
    AssetAllocator__factory,
    BalancerV2PriceOracle,
    BalancerV2PriceOracle__factory,
    BPTMNLTBondDepository,
    BPTMNLTBondDepository__factory,
    BPTMNLTPriceOracle,
    BPTPriceOracleV2__factory,
    DAI,
    DAI__factory,
    Distributor,
    Distributor__factory,
    ExodiaBalanceAggregator,
    ExodiaBalanceAggregator__factory,
    ExodiaRoles,
    ExodiaRoles__factory,
    Farmer,
    Farmer__factory,
    FBEETSBondDepository,
    FBEETSBondDepository__factory,
    FBEETSPriceOracle,
    FBEETSPriceOracle__factory,
    GOHMBondDepository,
    GOHMBondDepository__factory,
    GOHMPriceOracle,
    GOHMPriceOracle__factory,
    LiquidLockStaking,
    LiquidLockStaking__factory,
    LLSRewardHandler,
    LLSRewardHandler__factory,
    MasterchefBalanceAdapter,
    MasterchefBalanceAdapter__factory,
    MasterLock,
    MasterLock__factory,
    OHMCirculatingSupplyContract,
    OHMCirculatingSupplyContract__factory,
    OlympusBondDepository,
    OlympusBondDepository__factory,
    OlympusBondingCalculator,
    OlympusBondingCalculator__factory,
    OlympusERC20Token,
    OlympusERC20Token__factory,
    OlympusStaking,
    OlympusStaking__factory,
    OlympusTreasury,
    OlympusTreasury__factory,
    RedeemHelper,
    RedeemHelper__factory,
    RemoveUniLp,
    RemoveUniLp__factory,
    SOlympus,
    SOlympus__factory,
    StakingHelper,
    StakingHelper__factory,
    StakingHelperV2,
    StakingHelperV2__factory,
    StakingWarmup,
    StakingWarmup__factory,
    TreasuryDepositor,
    TreasuryDepositor__factory,
    TreasuryManager,
    TreasuryManager__factory,
    TreasuryTracker,
    TreasuryTracker__factory,
    WenAbsorptionBondDepository,
    WenAbsorptionBondDepository__factory,
    WFTMBondDepository,
    WFTMBondDepository__factory,
    WOHM,
    WOHM__factory,
    PriceProvider,
    PriceProvider__factory,
    ChainlinkPriceOracle,
    ChainlinkPriceOracle__factory,
    SolidexBalanceAdapter,
    SolidexBalanceAdapter__factory,
} from "../typechain";

import { ContractVersions, NetworksContractsRegistry, version } from "./contractRegistry";
import { Network } from "./Network";

export interface IExternalContractsRegistry {
    REVEST_REGISTRY: string;
    THE_MONOLITH_POOL: string;
    THE_MONOLITH_POOLID: string;
    BEETHOVEN_VAULT: string;
    DAI: string;
    MAI_TOKEN: string;
    WFTM: string;
    FTM_USD_FEED: string;
    USDC_USD_FEED: string;
    DAI_USD_FEED: string;
    OHM_USD_FEED: string;
    OHM_INDEX_FEED: string;
    SPIRIT_FTM_GOHM: string;
    SPOOKY_MAI_USDC: string;
    SPOOKY_ROUTER: string;
    EXODDAI_LP: string;
    GUIQIN_QI_POOLID: string;
    FIDELIO_DUETTO: string;
    FBEETS_BAR: string;
    BEETS_MASTERCHEF: string;
    BEETS: string;
    YEARN_DAI_VAULT: string;
    GOHM: string;
    DEMETER_DEGREE: string;
    EXODFTM_HLP: string;
    SOLIDEX_LP_DEPOSITOR: string;
}

export interface IExodiaContractsRegistry {
    OlympusERC20Token: ContractVersions<OlympusERC20Token>;
    sOlympus: ContractVersions<SOlympus>;
    OHMCirculatingSupplyContract: ContractVersions<OHMCirculatingSupplyContract>;
    OlympusStaking: ContractVersions<OlympusStaking>;
    DAI: ContractVersions<DAI>;
    OlympusTreasury: ContractVersions<OlympusTreasury>;
    StakingWarmup: ContractVersions<StakingWarmup>;
    StakingHelper: ContractVersions<StakingHelper>;
    StakingHelperV2: ContractVersions<StakingHelperV2>;
    Distributor: ContractVersions<Distributor>;
    OlympusBondingCalculator: ContractVersions<OlympusBondingCalculator>;
    RedeemHelper: ContractVersions<RedeemHelper>;
    DAIBondDepository: ContractVersions<OlympusBondDepository>;
    wOHM: ContractVersions<WOHM>;
    RemoveUniLp: ContractVersions<RemoveUniLp>;
    BPTMNLTPriceOracle: ContractVersions<BPTMNLTPriceOracle>;
    GOHMBondDepository: ContractVersions<GOHMBondDepository>;
    GOHMPriceOracle: ContractVersions<GOHMPriceOracle>;
    MasterLock: ContractVersions<MasterLock>;
    LiquidLockStaking: ContractVersions<LiquidLockStaking>;
    LLSRewardHandler: ContractVersions<LLSRewardHandler>;
    BPTMNLTBondDepository: ContractVersions<BPTMNLTBondDepository>;
    fBEETSPriceOracle: ContractVersions<FBEETSPriceOracle>;
    fBEETSBondDepository: ContractVersions<FBEETSBondDepository>;
    AssetAllocator: ContractVersions<AssetAllocator>;
    AllocatedRiskFreeValue: ContractVersions<AllocatedRiskFreeValue>;
    wFTMBondDepository: ContractVersions<WFTMBondDepository>;
    WenAbsorptionBondDepository: ContractVersions<WenAbsorptionBondDepository>;
    TreasuryTracker: ContractVersions<TreasuryTracker>;
    MasterchefBalanceAdapter: ContractVersions<MasterchefBalanceAdapter>;
    AllocationCalculator: ContractVersions<AllocationCalculator>;
    ExodiaRoles: ContractVersions<ExodiaRoles>;
    TreasuryManager: ContractVersions<TreasuryManager>;
    TreasuryDepositor: ContractVersions<TreasuryDepositor>;
    BalancerV2PriceOracle: ContractVersions<BalancerV2PriceOracle>;
    ChainlinkPriceOracle: ContractVersions<ChainlinkPriceOracle>;
    PriceProvider: ContractVersions<PriceProvider>;
    Farmer: ContractVersions<Farmer>;
    ExodiaBalanceAggregator: ContractVersions<ExodiaBalanceAggregator>;
    SolidexBalanceAdapter: ContractVersions<SolidexBalanceAdapter>;
}

export const contracts = new NetworksContractsRegistry<IExodiaContractsRegistry>();
const mainOperaContract: IExodiaContractsRegistry = {
    OlympusERC20Token: new ContractVersions([
        version(
            OlympusERC20Token__factory.connect,
            "0x3b57f3feaaf1e8254ec680275ee6e7727c7413c7"
        ),
    ]),
    sOlympus: new ContractVersions([
        version(SOlympus__factory.connect, "0x8de250c65636ef02a75e4999890c91cecd38d03d"),
    ]),
    OHMCirculatingSupplyContract: new ContractVersions([
        version(
            OHMCirculatingSupplyContract__factory.connect,
            "0x571ef9199c3559d2450d509a4bda1127f729d205"
        ),
    ]),
    OlympusStaking: new ContractVersions([
        version(
            OlympusStaking__factory.connect,
            "0x8b8d40f98a2f14E2dD972b3f2E2a2CC227d1E3Be"
        ),
    ]),
    DAI: new ContractVersions<DAI>([
        version(DAI__factory.connect, "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e"),
    ]),
    OlympusTreasury: new ContractVersions([
        version(
            OlympusTreasury__factory.connect,
            "0x6A654D988eEBCD9FfB48ECd5AF9Bd79e090D8347"
        ),
    ]),
    StakingWarmup: new ContractVersions<StakingWarmup>([
        version(
            StakingWarmup__factory.connect,
            "0xFb14cce5f6951e6c0935927C00a01FC57ed65920"
        ),
    ]),
    StakingHelper: new ContractVersions<StakingHelper>([
        version(
            StakingHelper__factory.connect,
            "0x43CdFC01C2DEF98C595b28E72b58D2575AA05E9B"
        ),
    ]),
    StakingHelperV2: new ContractVersions<StakingHelperV2>([
        version(
            StakingHelperV2__factory.connect,
            "0x19c027fA2dFA8a9aAD43f36e1ff2B06B2b8e2bf3"
        ),
    ]),
    Distributor: new ContractVersions<Distributor>([
        version(
            Distributor__factory.connect,
            "0xd8DA31efE8d83A8ae511D858A93524F14e66dd80"
        ),
    ]),
    OlympusBondingCalculator: new ContractVersions<OlympusBondingCalculator>([
        version(
            OlympusBondingCalculator__factory.connect,
            "0x01884c8FBA9E2C510093d2af308e7a8bA7060b8F"
        ),
    ]),
    RedeemHelper: new ContractVersions<RedeemHelper>([
        version(
            RedeemHelper__factory.connect,
            "0x9d1530475b6282Bd92da5628E36052f70C56A208"
        ),
    ]),
    DAIBondDepository: new ContractVersions<OlympusBondDepository>([
        version(
            OlympusBondDepository__factory.connect,
            "0xC43Db16Ed7b57597170b76D3afF29708bc608483"
        ),
    ]),
    wOHM: new ContractVersions<WOHM>([
        version(WOHM__factory.connect, "0xe992C5Abddb05d86095B18a158251834D616f0D1"),
    ]),
    RemoveUniLp: new ContractVersions<RemoveUniLp>([
        version(
            RemoveUniLp__factory.connect,
            "0xde88F5f28771B84512d3B355a1C9065B3586dA1c"
        ),
    ]),
    GOHMPriceOracle: new ContractVersions<GOHMPriceOracle>([
        version(
            GOHMPriceOracle__factory.connect,
            "0x5E1DEE184a4809EBfcEDa72E4287f4d2d62dC6C1"
        ),
    ]),
    GOHMBondDepository: new ContractVersions<GOHMBondDepository>([
        version(
            GOHMBondDepository__factory.connect,
            "0xcf69Ba319fF0F8e2481dE13d16CE7f74b063533E"
        ),
    ]),
    MasterLock: new ContractVersions<MasterLock>([version(MasterLock__factory.connect)]),
    LiquidLockStaking: new ContractVersions<LiquidLockStaking>([
        version(LiquidLockStaking__factory.connect),
    ]),
    LLSRewardHandler: new ContractVersions<LLSRewardHandler>([
        version(LLSRewardHandler__factory.connect),
    ]),
    BPTMNLTPriceOracle: new ContractVersions<BPTMNLTPriceOracle>([
        version(
            BPTPriceOracleV2__factory.connect,
            "0x982a5A71C411f2eF748C91DC97D60C07E1016d4e"
        ),
    ]),
    BPTMNLTBondDepository: new ContractVersions<BPTMNLTBondDepository>([
        version(
            BPTMNLTBondDepository__factory.connect,
            "0x86E21dB31c154aE777e0C126999e89Df0C01D9Fa"
        ),
        version(
            BPTMNLTBondDepository__factory.connect,
            "0x18c01a517ED7216b52A4160c12bf814210477Ef2",
            28878457
        ),
    ]),
    fBEETSPriceOracle: new ContractVersions<FBEETSPriceOracle>([
        version(
            FBEETSPriceOracle__factory.connect,
            "0xB90Fc1e595C19d84eAeC802f95d32619bB2dE7A0"
        ),
    ]),
    fBEETSBondDepository: new ContractVersions<FBEETSBondDepository>([
        version(
            FBEETSBondDepository__factory.connect,
            "0xe2eA15E992455972Ae11De0a543C48DbeAb9E5Ce"
        ),
    ]),
    AssetAllocator: new ContractVersions<AssetAllocator>([
        version(AssetAllocator__factory.connect),
    ]),
    AllocatedRiskFreeValue: new ContractVersions<AllocatedRiskFreeValue>([
        version(
            AllocatedRiskFreeValue__factory.connect,
            "0x4907918C64197B7C96437d831CA9fD264B8a7A8F"
        ),
    ]),
    wFTMBondDepository: new ContractVersions<WFTMBondDepository>([
        version(
            WFTMBondDepository__factory.connect,
            "0xd7cbA20A464C10FB03Bbc265D962ADa8e29af118"
        ),
        version(
            WFTMBondDepository__factory.connect,
            "0x39086c3E5979d6F0aB0a54e3135D6e3eDD53c395",
            29523359
        ),
    ]),
    WenAbsorptionBondDepository: new ContractVersions<WenAbsorptionBondDepository>([
        version(
            WenAbsorptionBondDepository__factory.connect,
            "0xf74c60fCa30BFbff0d99D5BFcba3A3fCEa8C47FB"
        ),
    ]),
    TreasuryTracker: new ContractVersions<TreasuryTracker>([
        version(
            TreasuryTracker__factory.connect,
            "0x68f30FEd7a9132832d93fAE18dE717D6533edF97"
        ),
    ]),
    MasterchefBalanceAdapter: new ContractVersions<MasterchefBalanceAdapter>([
        version(
            MasterchefBalanceAdapter__factory.connect,
            "0x853ab5f4678e7f6de4a717f1ca1b48f4893d120c"
        ),
    ]),
    AllocationCalculator: new ContractVersions<AllocationCalculator>([
        version(AllocationCalculator__factory.connect),
    ]),
    ExodiaRoles: new ContractVersions<ExodiaRoles>([
        version(ExodiaRoles__factory.connect),
    ]),
    TreasuryManager: new ContractVersions<TreasuryManager>([
        version(TreasuryManager__factory.connect),
    ]),
    TreasuryDepositor: new ContractVersions<TreasuryDepositor>([
        version(TreasuryDepositor__factory.connect),
    ]),
    BalancerV2PriceOracle: new ContractVersions<BalancerV2PriceOracle>([
        version(BalancerV2PriceOracle__factory.connect),
    ]),
    ChainlinkPriceOracle: new ContractVersions<ChainlinkPriceOracle>([
        version(ChainlinkPriceOracle__factory.connect),
    ]),
    PriceProvider: new ContractVersions<PriceProvider>([
        version(PriceProvider__factory.connect),
    ]),
    Farmer: new ContractVersions<Farmer>([version(Farmer__factory.connect)]),
    ExodiaBalanceAggregator: new ContractVersions<ExodiaBalanceAggregator>([
        version(
            ExodiaBalanceAggregator__factory.connect,
            "0xa3Cbd851460477C7b7aAA381da7ee4043462657F"
        ),
    ]),
    SolidexBalanceAdapter: new ContractVersions<SolidexBalanceAdapter>([
        version(SolidexBalanceAdapter__factory.connect),
    ]),
};

const testNetOperaContract: IExodiaContractsRegistry = {
    OlympusERC20Token: new ContractVersions([
        version(
            OlympusERC20Token__factory.connect,
            "0xD5A6853d76D39597D3B29ec66811f8246b78bA0b"
        ),
    ]),
    sOlympus: new ContractVersions([
        version(SOlympus__factory.connect, "0x055B72A75c77a27d576f47A0821DBD198EBafdc3"),
    ]),
    OHMCirculatingSupplyContract: new ContractVersions([
        version(
            OHMCirculatingSupplyContract__factory.connect,
            "0x3fB1B92239835F0413E028f591A7AF1a4D02a03c"
        ),
    ]),
    OlympusStaking: new ContractVersions([
        version(
            OlympusStaking__factory.connect,
            "0xD107b5E9cFCb4FD3aae8D139C814F19ed2547940"
        ),
    ]),
    DAI: new ContractVersions<DAI>([
        version(DAI__factory.connect, "0xEF6834b5a29D75a883406B19f3eEefbF87b5031A"),
    ]),
    OlympusTreasury: new ContractVersions([
        version(
            OlympusTreasury__factory.connect,
            "0x1d2ec2C0c375a38C78e4342e8F6A730201CCEb41"
        ),
    ]),
    StakingWarmup: new ContractVersions<StakingWarmup>([
        version(
            StakingWarmup__factory.connect,
            "0xA5119B6d5456611a4Ac0ceaa1e667139C490CDD9"
        ),
    ]),
    StakingHelper: new ContractVersions<StakingHelper>([]),
    StakingHelperV2: new ContractVersions<StakingHelperV2>([
        version(
            StakingHelperV2__factory.connect,
            "0xb514E20e244812380996a57ba0daE0F60fc2Ff5f"
        ),
    ]),
    Distributor: new ContractVersions<Distributor>([
        version(
            Distributor__factory.connect,
            "0xAF10E46D8bd5DF0234CAc8fECE2FF9438301ccB5"
        ),
    ]),
    OlympusBondingCalculator: new ContractVersions<OlympusBondingCalculator>([
        version(
            OlympusBondingCalculator__factory.connect,
            "0x5f2CfF691065eAf57Edf90B660BA007A956AFd56"
        ),
    ]),
    RedeemHelper: new ContractVersions<RedeemHelper>([
        version(
            RedeemHelper__factory.connect,
            "0x9bb05525A05A121dE0508408E26adc208beD3888"
        ),
    ]),
    DAIBondDepository: new ContractVersions<OlympusBondDepository>([
        version(
            OlympusBondDepository__factory.connect,
            "0x1B6F86BC319e3B363aC5299c045Ae29D95d7A623"
        ),
    ]),
    wOHM: new ContractVersions<WOHM>([
        version(WOHM__factory.connect, "0x133f6D7d457377bfA6a43933127498fA40ef11CF"),
    ]),
    RemoveUniLp: new ContractVersions<RemoveUniLp>([
        version(RemoveUniLp__factory.connect),
    ]),
    GOHMPriceOracle: new ContractVersions<GOHMPriceOracle>([
        version(GOHMPriceOracle__factory.connect),
    ]),
    GOHMBondDepository: new ContractVersions<GOHMBondDepository>([
        version(GOHMBondDepository__factory.connect),
    ]),
    MasterLock: new ContractVersions<MasterLock>([version(MasterLock__factory.connect)]),
    LiquidLockStaking: new ContractVersions<LiquidLockStaking>([
        version(LiquidLockStaking__factory.connect),
    ]),
    LLSRewardHandler: new ContractVersions<LLSRewardHandler>([
        version(LLSRewardHandler__factory.connect),
    ]),
    BPTMNLTPriceOracle: new ContractVersions<BPTMNLTPriceOracle>([
        version(BPTPriceOracleV2__factory.connect),
    ]),
    BPTMNLTBondDepository: new ContractVersions<BPTMNLTBondDepository>([
        version(BPTMNLTBondDepository__factory.connect),
    ]),
    fBEETSPriceOracle: new ContractVersions<FBEETSPriceOracle>([
        version(FBEETSPriceOracle__factory.connect),
    ]),
    fBEETSBondDepository: new ContractVersions<FBEETSBondDepository>([
        version(FBEETSBondDepository__factory.connect),
    ]),
    AssetAllocator: new ContractVersions<AssetAllocator>([
        version(AssetAllocator__factory.connect),
    ]),
    AllocatedRiskFreeValue: new ContractVersions<AllocatedRiskFreeValue>([
        version(AllocatedRiskFreeValue__factory.connect),
    ]),
    wFTMBondDepository: new ContractVersions<WFTMBondDepository>([
        version(WFTMBondDepository__factory.connect),
    ]),
    WenAbsorptionBondDepository: new ContractVersions<WenAbsorptionBondDepository>([
        version(WenAbsorptionBondDepository__factory.connect),
    ]),
    TreasuryTracker: new ContractVersions<TreasuryTracker>([
        version(TreasuryTracker__factory.connect),
    ]),
    MasterchefBalanceAdapter: new ContractVersions<MasterchefBalanceAdapter>([
        version(MasterchefBalanceAdapter__factory.connect),
    ]),
    AllocationCalculator: new ContractVersions<AllocationCalculator>([
        version(AllocationCalculator__factory.connect),
    ]),
    ExodiaRoles: new ContractVersions<ExodiaRoles>([
        version(ExodiaRoles__factory.connect),
    ]),
    TreasuryManager: new ContractVersions<TreasuryManager>([
        version(TreasuryManager__factory.connect),
    ]),
    TreasuryDepositor: new ContractVersions<TreasuryDepositor>([
        version(TreasuryDepositor__factory.connect),
    ]),
    BalancerV2PriceOracle: new ContractVersions<BalancerV2PriceOracle>([
        version(BalancerV2PriceOracle__factory.connect),
    ]),
    ChainlinkPriceOracle: new ContractVersions<ChainlinkPriceOracle>([
        version(ChainlinkPriceOracle__factory.connect),
    ]),
    PriceProvider: new ContractVersions<PriceProvider>([
        version(PriceProvider__factory.connect),
    ]),
    Farmer: new ContractVersions<Farmer>([version(Farmer__factory.connect)]),
    ExodiaBalanceAggregator: new ContractVersions<ExodiaBalanceAggregator>([
        version(ExodiaBalanceAggregator__factory.connect),
    ]),
    SolidexBalanceAdapter: new ContractVersions<SolidexBalanceAdapter>([
        version(SolidexBalanceAdapter__factory.connect),
    ]),
};

contracts.addNetwork(Network.OPERA_MAIN_NET, mainOperaContract);
contracts.addNetwork(Network.OPERA_TEST_NET, testNetOperaContract);
