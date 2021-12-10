# Exodia's contract

A BoilerPlate Template Project To Start Solidity Development With Hardhat and Typescript. All you have to do is create a new repository from the template and start coding your smartcontracts. 

## Hardhat Configuration

- typescript support enabled
- typechain plugin installed (typescript type bindings are generated from smart contracts)/check Typechain docs
- hardhat-deploy plugin enabled (use deployments from `deploy` folder, order and tag them; multi-network)
- hardhat console enabled - to allow console.log usage within solidity code
- testing environment configured and operational

Check the Hardhat documentation for more information. 

https://hardhat.org/getting-started/


We recommend installing `hh autocomplete` so you can use `hh` shorthand globally.

`npm i -g hardhat-shorthand`

https://hardhat.org/guides/shorthand.html

## Usage

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
|StakingHelper  |[0x43CdFC01C2DEF98C595b28E72b58D2575AA05E9B](https://ftmscan.com/address/0x43cdfc01c2def98c595b28e72b58d2575aa05e9b)| Helper Contract to Stake with 0 warmup |
|DAO            |[0xC4e0cbe134c48085e8FF72eb31f0Ebca29b152ee](https://ftmscan.com/address/0xC4e0cbe134c48085e8FF72eb31f0Ebca29b152ee)|Storage Wallet for DAO under MS |
|Staking Warm Up|[0xfb14cce5f6951e6c0935927c00a01fc57ed65920](https://ftmscan.com/address/0xfb14cce5f6951e6c0935927c00a01fc57ed65920)| Instructs the Staking contract when a user can claim sOHM |


**Bonds**
- **_TODO_**: What are the requirements for creating a Bond Contract?
All LP bonds use the Bonding Calculator contract which is used to compute RFV. 

|Contract       | Addresss                                                                                                            | Notes   |
|:-------------:|:-------------------------------------------------------------------------------------------------------------------:|-------|
|Bond Calculator|[0x01884c8FBA9E2C510093d2af308e7a8bA7060b8F](https://ftmscan.com/address/0x01884c8fba9e2c510093d2af308e7a8ba7060b8f)| |
|DAI bond|[0xc43db16ed7b57597170b76d3aff29708bc608483](https://ftmscan.com/address/0xc43db16ed7b57597170b76d3aff29708bc608483)| Main bond managing serve mechanics for OHM/DAI|
|DAI/EXOD spLP Bond|[0x5B7E66542800cA1A27402DD00f4325460553C5eb](https://ftmscan.com/address/0x5b7e66542800ca1a27402dd00f4325460553c5eb#code)| Manages mechanism for the protocol to buy back its own liquidity from the pair. |
|wFTM bond      |[0xd7cbA20A464C10FB03Bbc265D962ADa8e29af118](https://ftmscan.com/address/0xd7cba20a464c10fb03bbc265d962ada8e29af118)| Manages wFTM bonds


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
