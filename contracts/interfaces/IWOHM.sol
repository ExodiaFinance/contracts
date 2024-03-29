// SPDX-License-Identifier: MIT
pragma solidity >=0.7.5;

interface IWOHM {
    function wrapFromOHM(uint256 _amount) external returns (uint256);

    function wOHMValue(uint256 _amount) external view returns (uint256);
}
