// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../Policy.sol";
import "../strategies/IAssetAllocator.sol";
import "./ITreasuryTracker.sol";

import "hardhat/console.sol";

interface IBalanceAdapter {
    function balance(address _holder, address _token) external view returns (uint256);
}

contract TreasuryTracker is ITreasuryTracker, Policy {
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet private assetsWithRisk;
    EnumerableSet.AddressSet private riskFreeAssets;
    EnumerableSet.AddressSet private bpts;
    EnumerableSet.AddressSet private uniLps;
    EnumerableSet.AddressSet private contracts;
    EnumerableSet.AddressSet private EOAs;
    EnumerableSet.AddressSet private adapters;
    address public assetAllocator;

    constructor() {}

    function balances() external override returns (address[] memory, uint256[] memory) {
        uint256 length = assetsWithRisk.length() +
            riskFreeAssets.length() +
            bpts.length() +
            uniLps.length();
        address[] memory tokens = new address[](length);
        uint256[] memory balances = new uint256[](length);
        uint256 i = 0;
        for (; i < assetsWithRisk.length(); i++) {
            address token = assetsWithRisk.at(i);
            tokens[i] = token;
            balances[i] = _balance(token);
        }
        for (uint256 j = 0; j < riskFreeAssets.length(); j++) {
            address token = riskFreeAssets.at(j);
            tokens[i + j] = token;
            balances[i + j] = _balance(token);
        }
        i += riskFreeAssets.length();
        for (uint256 j = 0; j < bpts.length(); j++) {
            address token = bpts.at(j);
            tokens[i + j] = token;
            balances[i + j] = _balance(token);
        }
        i += bpts.length();
        for (uint256 j = 0; j < uniLps.length(); j++) {
            address token = uniLps.at(j);
            tokens[i + j] = token;
            balances[i + j] = _balance(token);
        }
        return (tokens, balances);
    }

    function _balance(address _asset) internal returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < contracts.length(); i++) {
            total += IERC20(_asset).balanceOf(contracts.at(i));
        }
        for (uint256 i = 0; i < EOAs.length(); i++) {
            total += IERC20(_asset).balanceOf(EOAs.at(i));
            for (uint256 j = 0; j < adapters.length(); j++) {
                total += IBalanceAdapter(adapters.at(j)).balance(EOAs.at(i), _asset);
            }
        }
        if (assetAllocator != address(0)) {
            total += IAssetAllocator(assetAllocator).allocatedBalance(_asset);
        }
        return total;
    }

    function balance(address _address) external returns (uint256) {
        return _balance(_address);
    }

    function getAssetsWithRisk() external view returns (address[] memory) {
        return assetsWithRisk.values();
    }

    function addAssetWithRisk(address _asset) external onlyPolicy {
        require(!assetsWithRisk.contains(_asset), "Asset already added");
        assetsWithRisk.add(_asset);
    }

    function removeAssetWithRisk(address _asset) external onlyPolicy {
        assetsWithRisk.remove(_asset);
    }

    function getRiskFreeAssets() external view returns (address[] memory) {
        return riskFreeAssets.values();
    }

    function addRiskFreeAsset(address _asset) external onlyPolicy {
        require(!riskFreeAssets.contains(_asset), "Asset already added");
        riskFreeAssets.add(_asset);
    }

    function removeRiskFreeAsset(address _asset) external onlyPolicy {
        riskFreeAssets.remove(_asset);
    }

    function getBPTs() external view returns (address[] memory) {
        return bpts.values();
    }

    function addBPT(address _bpt) external onlyPolicy {
        require(!bpts.contains(_bpt), "BPT already added");
        bpts.add(_bpt);
    }

    function removeBPT(address _bpt) external onlyPolicy {
        bpts.remove(_bpt);
    }

    function getUniLPs() external view returns (address[] memory) {
        return uniLps.values();
    }

    function addUniLP(address _lp) external onlyPolicy {
        require(!uniLps.contains(_lp), "LP already added");
        uniLps.add(_lp);
    }

    function removeUniLP(address _lp) external onlyPolicy {
        uniLps.remove(_lp);
    }

    function getContracts() external view returns (address[] memory) {
        return contracts.values();
    }

    function addContract(address _contract) external onlyPolicy {
        require(!contracts.contains(_contract), "Contract already added");
        contracts.add(_contract);
    }

    function removeContract(address _contract) external onlyPolicy {
        contracts.remove(_contract);
    }

    function getEOAs() external view returns (address[] memory) {
        return EOAs.values();
    }

    function addEOA(address _eoa) external onlyPolicy {
        require(!EOAs.contains(_eoa), "Address already added");
        EOAs.add(_eoa);
    }

    function removeEOA(address _eoa) external onlyPolicy {
        EOAs.remove(_eoa);
    }

    function getAdapters() external view returns (address[] memory) {
        return adapters.values();
    }

    function addAdapter(address _adapter) external onlyPolicy {
        require(!adapters.contains(_adapter), "Adapter already added");
        adapters.add(_adapter);
    }

    function removeAdapter(address _adapter) external onlyPolicy {
        adapters.remove(_adapter);
    }

    function setAllocator(address _allocator) external onlyPolicy {
        assetAllocator = _allocator;
    }
}
