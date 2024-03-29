// SPDX-License-Identifier: MIT
pragma solidity >=0.7.5;
pragma abicoder v2;

interface IAllocationCalculator {
    function getStrategies(address _token) external view returns (address[] memory);

    function calculateAllocation(address _token, uint256 _manageable)
        external
        view
        returns (uint256[] memory, uint256);
}
