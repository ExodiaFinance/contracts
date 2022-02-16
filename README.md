# Exodia's contract

A BoilerPlate Template Project To Start Solidity Development With Hardhat and Typescript. All you have to do is create a new repository from the template and start coding your smartcontracts. 

## Hardhat Configuration

- typescript support enabled
- typechain plugin installed (typescript type bindings are generated from smart contracts)/check Typechain docs
- hardhat-deploy plugin enabled (use deployments from `deploy` folder, order and tag them; multi-network)
- hardhat console enabled - to allow console.log usage within solidity code
- testing environment configured and operational
- Hardhat environment has been extended to instanciate Typechain contract automatically (src/HardhatRegistryExtension)

Check the Hardhat documentation for more information. 

https://hardhat.org/getting-started/


We recommend installing `hh autocomplete` so you can use `hh` shorthand globally.

`npm i -g hardhat-shorthand`

https://hardhat.org/guides/shorthand.html

## Usage

You need NodeJS 16.

1. Run `npm install`
2. Copy `.env.example` to `.env`
3. Update `.env` with your credentials.

- `hh compile` - to compile smart contract and generate typechain ts bindings
- `hh test` - to run tests
- `hh deploy` - to deploy to local network (see options for more)
- `hh node` - to run a localhost node


Check `package.json` scripts for more options.
Use `.env.example` file and adapt it to you values and settings.

## 🤨 How it all works
![High Level Contract Interactions](./docs/box-diagram.png)

## Mainnet Contracts & Addresses

|Contract       | Addresss                                                                                                            | Notes   |
|:-------------:|:-------------------------------------------------------------------------------------------------------------------:|-------|
|EXOD           |[0x3b57f3FeAaF1e8254ec680275Ee6E7727C7413c7](https://ftmscan.com/address/0x3b57f3feaaf1e8254ec680275ee6e7727c7413c7)| Main Token Contract|
|sEXOD           |[0x8de250C65636Ef02a75e4999890c91cECd38D03D](https://ftmscan.com/address/0x8de250C65636Ef02a75e4999890c91cECd38D03D)| Staked Ohm|
|Treasury       |[0x6A654D988eEBCD9FfB48ECd5AF9Bd79e090D8347](https://ftmscan.com/address/0x6a654d988eebcd9ffb48ecd5af9bd79e090d8347)| Olympus Treasury holds all the assets        |
|OlympusStaking |[0xfd31c7d00ca47653c6ce64af53c1571f9c36566a](https://ftmscan.com/address/0x8b8d40f98a2f14e2dd972b3f2e2a2cc227d1e3be)| Main Staking contract responsible for calling rebases every 2200 blocks|
|StakingHelperV2  |[0x19c027fA2dFA8a9aAD43f36e1ff2B06B2b8e2bf3](https://ftmscan.com/address/0x19c027fA2dFA8a9aAD43f36e1ff2B06B2b8e2bf3)| Helper Contract to Stake with 0 warmup |
|DAO            |[0xC4e0cbe134c48085e8FF72eb31f0Ebca29b152ee](https://ftmscan.com/address/0xC4e0cbe134c48085e8FF72eb31f0Ebca29b152ee)|Storage Wallet for DAO under MS |
|Staking Warm Up|[0xfb14cce5f6951e6c0935927c00a01fc57ed65920](https://ftmscan.com/address/0xfb14cce5f6951e6c0935927c00a01fc57ed65920)| Instructs the Staking contract when a user can claim sOHM |


**Bonds**

Bonds use the bonding calculator only if they have risk free value. Otherwise it is not added the
treasury as a reserve token nor liquidity token so the valueOf call on the treasury returns 0.

|Contract       | Addresss                                                                                                            | Notes   |
|:-------------:|:-------------------------------------------------------------------------------------------------------------------:|-------|
|Bond Calculator|[0x01884c8FBA9E2C510093d2af308e7a8bA7060b8F](https://ftmscan.com/address/0x01884c8fba9e2c510093d2af308e7a8ba7060b8f)| |
|DAI bond       |[0xc43db16ed7b57597170b76d3aff29708bc608483](https://ftmscan.com/address/0xc43db16ed7b57597170b76d3aff29708bc608483)| |
|BPT-MNLT bond  |[0x18c01a517ED7216b52A4160c12bf814210477Ef2](https://ftmscan.com/address/0x18c01a517ed7216b52a4160c12bf814210477ef2)| |
|wFTM bond      |[0x39086c3E5979d6F0aB0a54e3135D6e3eDD53c395](https://ftmscan.com/address/0x39086c3E5979d6F0aB0a54e3135D6e3eDD53c395)| |
|gOHM bond      |[0xcf69Ba319fF0F8e2481dE13d16CE7f74b063533E](https://ftmscan.com/address/0xcf69ba319ff0f8e2481de13d16ce7f74b063533e)| |
|fBEETS bond    |[0xe2eA15E992455972Ae11De0a543C48DbeAb9E5Ce](https://ftmscan.com/address/0xe2ea15e992455972ae11de0a543c48dbeab9e5ce)| |

## Allocator Guide

The following is a guide for interacting with the treasury as a reserve allocator.

A reserve allocator is a contract that deploys funds into external strategies, such as Aave, Curve, etc.

Treasury Address: `0x31F8Cc382c9898b273eff4e0b7626a6987C846E8`

**Managing**:
The first step is withdraw funds from the treasury via the "manage" function. "Manage" allows an approved address to withdraw excess reserves from the treasury.

*Note*: This contract must have the "reserve manager" permission, and that withdrawn reserves decrease the treasury's ability to mint new OHM (since backing has been removed).

Pass in the token address and the amount to manage. The token will be sent to the contract calling the function.

```
function manage( address _token, uint _amount ) external;
```

Managing treasury assets should look something like this:
```
treasury.manage( DAI, amountToManage );
```

**Returning**:
The second step is to return funds after the strategy has been closed.
We utilize the `deposit` function to do this. Deposit allows an approved contract to deposit reserve assets into the treasury, and mint OHM against them. In this case however, we will NOT mint any OHM. This will be explained shortly.

*Note* The contract must have the "reserve depositor" permission, and that deposited reserves increase the treasury's ability to mint new OHM (since backing has been added).


Pass in the address sending the funds (most likely the allocator contract), the amount to deposit, and the address of the token. The final parameter, profit, dictates how much OHM to send. send_, the amount of OHM to send, equals the value of amount minus profit.
```
function deposit( address _from, uint _amount, address _token, uint _profit ) external returns ( uint send_ );
```

To ensure no OHM is minted, we first get the value of the asset, and pass that in as profit.
Pass in the token address and amount to get the treasury value.
```
function valueOf( address _token, uint _amount ) public view returns ( uint value_ );
```

All together, returning funds should look something like this:
```
treasury.deposit( address(this), amountToReturn, DAI, treasury.valueOf( DAI, amountToReturn ) );
```
## Creating a new contract

To avoid mistakes and help strengthen naming convention of contracts we added typescript support to the deploy and get function
from the hardhat-deploy extension. It will also automatically instanciante the Typechain instance to help speed up dev.
This requires a few changes in the code for every new contract you want to add.

1. Create one contract per file. The name of the file must be the name of your contract
2. Compile the contracts to generate the Typechain bindings
3. Add your contract to the interface in IExodiaContractsRegistry `src/contracts/exodiaContracts.ts`. The name of the attribute MUST be the same than your contract name.
4. Add the typechain factory for you contracts in `const mainOperaContract` and `const testNetOperaContract`
5. Write the deployment file for the contract. For example: `deploy/04_setVault.ts`
6. Write the tests for your contract using the hardhat-deploy fixtures. The name of your test must be the same than your contract. For example: `test/bonds/AbsorptionBondDepository.test.ts`

