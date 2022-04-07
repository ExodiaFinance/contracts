// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./TreasuryTracker.sol";
import "../ExodiaAccessControlInitializable.sol";

interface IVaultNft {
    function vaultCollateral(uint _id) external view returns(uint);
    function collateral() external view returns(address);
    function ownerOf(uint _id) external view returns (address);
}

interface BeefyIbToken {
    function getPricePerFullShare() external view returns (uint256);
    function decimals() external view returns(uint);
}

interface YearnIbToken {
    function pricePerShare() external view returns (uint256);
    function decimals() external view returns(uint);
}

contract MaiVaultAdapter is ExodiaAccessControlInitializable, IBalanceAdapter {
    
    enum VaultType {
        NO,
        YEARN,
        BEEFY
    }

    struct Vaults {
        address basicVault;
        uint[] ids;
        address yearnVault;
        uint[] yids;
        address beefyVault;
        uint[] bids;
    }
    
    mapping(address => Vaults) public vaultsForToken;
    
    function initialize(address _roles) external initializer {
        ExodiaAccessControlInitializable.initializeAccessControl(_roles);
    }

    function configVault(address _token, address _vault, address _yearnVault, address _beefyVault) external onlyArchitect {
        vaultsForToken[_token].basicVault = _vault;
        vaultsForToken[_token].yearnVault = _yearnVault;
        vaultsForToken[_token].beefyVault =_beefyVault;
    }
    
    function addVault(address _token, VaultType _type, uint _id) external onlyArchitect {
        if (_type == VaultType.NO) {
            vaultsForToken[_token].ids.push(_id);
        } else if(_type == VaultType.YEARN) {
            vaultsForToken[_token].yids.push(_id);
        } else if(_type == VaultType.BEEFY) {
            vaultsForToken[_token].bids.push(_id);
        } 
    }
    
    function balance(address _holder, address _token)
    external
    view
    override
    returns (uint256)
    {
        Vaults memory vaults = vaultsForToken[_token];
        uint256 total = 0;
        if(vaults.basicVault != address(0)){
            IVaultNft vault = IVaultNft(vaults.basicVault);
            for (uint256 i = 0; i < vaults.ids.length; i++) {
                if(vault.ownerOf(vaults.ids[i]) == _holder){
                    total += vault.vaultCollateral(vaults.ids[i]);
                }
            }   
        }
        if(vaults.yearnVault != address(0)){
            for (uint256 i = 0; i < vaults.yids.length; i++) {
                IVaultNft vault = IVaultNft(vaults.yearnVault);
                if(vault.ownerOf(vaults.yids[i]) == _holder){
                    total += vault.vaultCollateral(vaults.yids[i]) *
                    YearnIbToken(vault.collateral()).pricePerShare() /
                    YearnIbToken(vault.collateral()).decimals();
                }
            }
        }
        if(vaults.beefyVault != address(0)){
            for (uint256 i = 0; i < vaults.bids.length; i++) {
                IVaultNft vault = IVaultNft(vaults.beefyVault);
                if(vault.ownerOf(vaults.bids[i]) == _holder){
                    total += vault.vaultCollateral(vaults.bids[i]) *
                    BeefyIbToken(vault.collateral()).getPricePerFullShare() /
                    BeefyIbToken(vault.collateral()).decimals();
                }
            }
        }
        return total;
    }


}
