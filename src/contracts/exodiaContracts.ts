import {
    DAI,
    DAI__factory,
    Distributor,
    Distributor__factory,
    GOHMBondDepository,
    GOHMBondDepository__factory,
    GOHMSpotPriceOracle,
    GOHMSpotPriceOracle__factory,
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
    WOHM,
    WOHM__factory,
} from "../../typechain";

import { ContractVersions, NetworksContractsRegistry, version } from "./contractRegistry";
import { Network } from "./Network";

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
    GOHMBondDepository: ContractVersions<GOHMBondDepository>;
    GOHMSpotPriceOracle: ContractVersions<GOHMSpotPriceOracle>;
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
        version(RemoveUniLp__factory.connect),
    ]),
    GOHMSpotPriceOracle: new ContractVersions<GOHMSpotPriceOracle>([
        version(GOHMSpotPriceOracle__factory.connect),
    ]),
    GOHMBondDepository: new ContractVersions<GOHMBondDepository>([
        version(GOHMBondDepository__factory.connect),
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
    GOHMSpotPriceOracle: new ContractVersions<GOHMSpotPriceOracle>([
        version(GOHMSpotPriceOracle__factory.connect),
    ]),
    GOHMBondDepository: new ContractVersions<GOHMBondDepository>([
        version(GOHMBondDepository__factory.connect),
    ]),
};

const hardhatContracts: IExodiaContractsRegistry = {
    OlympusERC20Token: new ContractVersions([
        version(OlympusERC20Token__factory.connect),
    ]),
    sOlympus: new ContractVersions([version(SOlympus__factory.connect)]),
    OHMCirculatingSupplyContract: new ContractVersions([
        version(OHMCirculatingSupplyContract__factory.connect),
    ]),
    OlympusStaking: new ContractVersions([version(OlympusStaking__factory.connect)]),
    DAI: new ContractVersions<DAI>([version(DAI__factory.connect)]),
    OlympusTreasury: new ContractVersions([version(OlympusTreasury__factory.connect)]),
    StakingWarmup: new ContractVersions<StakingWarmup>([
        version(StakingWarmup__factory.connect),
    ]),
    StakingHelper: new ContractVersions<StakingHelper>([]),
    StakingHelperV2: new ContractVersions<StakingHelperV2>([
        version(StakingHelperV2__factory.connect),
    ]),
    Distributor: new ContractVersions<Distributor>([
        version(Distributor__factory.connect),
    ]),
    OlympusBondingCalculator: new ContractVersions<OlympusBondingCalculator>([
        version(OlympusBondingCalculator__factory.connect),
    ]),
    RedeemHelper: new ContractVersions<RedeemHelper>([
        version(RedeemHelper__factory.connect),
    ]),
    DAIBondDepository: new ContractVersions<OlympusBondDepository>([
        version(OlympusBondDepository__factory.connect),
    ]),
    wOHM: new ContractVersions<WOHM>([version(WOHM__factory.connect)]),
    RemoveUniLp: new ContractVersions<RemoveUniLp>([
        version(RemoveUniLp__factory.connect),
    ]),
    GOHMSpotPriceOracle: new ContractVersions<GOHMSpotPriceOracle>([
        version(GOHMSpotPriceOracle__factory.connect),
    ]),
    GOHMBondDepository: new ContractVersions<GOHMBondDepository>([
        version(GOHMBondDepository__factory.connect),
    ]),
};

contracts.addNetwork(Network.OPERA_MAIN_NET, mainOperaContract);
contracts.addNetwork(Network.OPERA_TEST_NET, testNetOperaContract);
contracts.addNetwork(Network.HARDHAT, hardhatContracts);
