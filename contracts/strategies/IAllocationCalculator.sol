// SPDX-License-Identifier: MIT
pragma solidity >=0.7.5;
pragma abicoder v2;

interface IAllocationCalculator {

    function setAllocation(
        address _token,
        address[] calldata _strategies,
        uint[] calldata _allocations
    ) external;
    function getStrategies(address _token) external view returns(address[] memory);
    function getAllocation(address _token) external view returns (address[] memory, uint[] memory);
    function calculateAllocation(address _token, uint _manageable) external view returns (uint[] memory, uint);

}
