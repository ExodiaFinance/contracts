// SPDX-License-Identifier: MIT
pragma solidity >=0.7.5;

interface IPolicy {
    function policy() external view returns (address);

    function renounceManagement() external;

    function pushManagement( address newOwner_ ) external;

    function pullManagement() external;
}
