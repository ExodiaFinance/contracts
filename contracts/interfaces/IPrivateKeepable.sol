// SPDX-License-Identifier: MIT
pragma solidity >=0.7.5;

interface IPrivateKeepable {

    function addPrivateKeeper(address _newKeeper) external;
    
    function isPrivateKeeper(address _keeper) external returns(bool);

    function removePrivateKeeper(address _address) external;
}
