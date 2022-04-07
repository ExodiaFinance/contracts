import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseEther, parseUnits } from "ethers/lib/utils";
import hre from "hardhat";
import { EXODIA_ROLES_DID } from "../deploy/38_deployExodiaRoles";

import { IExtendedHRE } from "../packages/HardhatRegistryExtension/ExtendedHRE";
import { externalAddressRegistry } from "../packages/sdk/contracts";
import { IExodiaContractsRegistry } from "../packages/sdk/contracts/exodiaContracts";
import {
    ExodiaRoles__factory,
    IVaultNft,
    IVaultNft__factory,
    MaiVaultAdapter,
    MaiVaultAdapter__factory,
    MasterchefBalanceAdapter,
    MasterchefBalanceAdapter__factory,
    YearnIbToken__factory,
} from "../packages/sdk/typechain";

import "./chai-setup";
import { ZERO_ADDRESS } from "../packages/utils/utils";
const xhre = hre as IExtendedHRE<IExodiaContractsRegistry>;
const { deployments, get, deploy, getNamedAccounts, getUnnamedAccounts, getNetwork } =
    xhre;

const MOO_WETH_VAULT = "0xC1c7eF18ABC94013F6c58C6CdF9e829A48075b4e";
const FTM_VAULT = "0x1066b8FC999c1eE94241344818486D5f944331A0";
const YEARN_FTM_VAULT = "0x7efB260662a6FA95c1CE1092c53Ca23733202798";
const MOO_FTM_VAULT = "0x3609A304c6A41d87E895b9c1fd18c02ba989Ba90";

describe("MasterchefBalanceAdapter", function () {
    let deployer: SignerWithAddress;
    let daoAddress: string;
    let balanceAdapter: MaiVaultAdapter;
    let WETH: string;
    let WFTM: string;
    let bethVault: IVaultNft;
    let yvFTMVault: IVaultNft;
    let mooFTMVault: IVaultNft;

    beforeEach(async function () {
        await deployments.fixture([EXODIA_ROLES_DID]);
        const { contract: roles } = await get<ExodiaRoles__factory>("ExodiaRoles");
        const { deployer: deployerAddress, DAO } = await getNamedAccounts();
        daoAddress = "0xC4e0cbe134c48085e8FF72eb31f0Ebca29b152ee";
        deployer = await xhre.ethers.getSigner(deployerAddress);
        const deployment = await deployments.deploy("MaiVaultAdapter", {
            from: deployerAddress,
        });
        const addresses = await externalAddressRegistry.forNetwork(await getNetwork());
        WETH = addresses.WETH;
        WFTM = addresses.WFTM;
        balanceAdapter = await MaiVaultAdapter__factory.connect(
            deployment.address,
            deployer
        );
        await balanceAdapter.initialize(roles.address);
        await balanceAdapter.configVault(WFTM, FTM_VAULT, YEARN_FTM_VAULT, MOO_FTM_VAULT);
        await balanceAdapter.configVault(
            WETH,
            ZERO_ADDRESS,
            ZERO_ADDRESS,
            MOO_WETH_VAULT
        );
        bethVault = IVaultNft__factory.connect(MOO_WETH_VAULT, deployer);
        yvFTMVault = IVaultNft__factory.connect(YEARN_FTM_VAULT, deployer);
        mooFTMVault = IVaultNft__factory.connect(MOO_FTM_VAULT, deployer);
    });

    it("Should return FTMs in yvFTM vault", async function () {
        const VAULT_ID = 2027;
        const yvFTMBal = await yvFTMVault.vaultCollateral(VAULT_ID);
        expect(yvFTMBal).to.not.eq(0);
        const yvFTM = YearnIbToken__factory.connect(
            await yvFTMVault.collateral(),
            deployer
        );
        const pricePerShare = await yvFTM.pricePerShare();
        await balanceAdapter.addVault(WFTM, 1, VAULT_ID);
        const vaultHolder = await yvFTMVault.ownerOf(VAULT_ID);
        const ftmVaultBal = await balanceAdapter.balance(vaultHolder, WFTM);
        const expectedBal = yvFTMBal
            .mul(pricePerShare)
            .div(parseUnits("1", await yvFTM.decimals()));
        expect(ftmVaultBal).to.be.closeTo(
            expectedBal,
            expectedBal.mul(1).div(100) as any
        );
        expect(await balanceAdapter.balance(deployer.address, WFTM)).to.eq(0);
    });

    it("Should return FTMs in MOO_FTM vault", async function () {
        const VAULT_ID = 0;
        const mooFTMBal = await mooFTMVault.vaultCollateral(VAULT_ID);
        expect(mooFTMBal).to.not.eq(0);
        await balanceAdapter.addVault(WFTM, 1, VAULT_ID);
        const vaultHolder = await mooFTMVault.ownerOf(VAULT_ID);
        const ftmVaultBal = await balanceAdapter.balance(vaultHolder, WFTM);
        expect(ftmVaultBal).to.be.gt(mooFTMBal);
        expect(await balanceAdapter.balance(deployer.address, WFTM)).to.eq(0);
    });
});
