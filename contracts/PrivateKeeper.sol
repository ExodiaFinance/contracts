// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity >=0.7.5;

import "./interfaces/IPrivateKeepable.sol";
import "./Policy.sol";

contract PrivateKeeper is IPrivateKeepable, Policy {
    mapping(address => bool) privateKeepers;

    event PrivateKeeperAdded(address indexed previousOwner);
    event PrivateKeeperRemoved(address indexed previousOwner);

    constructor() {}

    modifier onlyPrivateKeeper() {
        require(_isPrivateKeeper(msg.sender), "Not a private keeper");
        _;
    }

    function addPrivateKeeper(address _newKeeper) external override onlyPolicy {
        privateKeepers[_newKeeper] = true;
    }

    function isPrivateKeeper(address _keeper) external override returns (bool) {
        return _isPrivateKeeper(_keeper);
    }

    function _isPrivateKeeper(address _keeper) internal returns (bool) {
        return privateKeepers[_keeper];
    }

    function removePrivateKeeper(address _keeper) external override onlyPolicy {
        privateKeepers[_keeper] = false;
    }
}
