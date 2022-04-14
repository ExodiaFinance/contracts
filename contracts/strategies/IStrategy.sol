// SPDX-License-Identifier: MIT
pragma solidity >=0.7.5;

interface IStrategy {
    /// @dev deploys the fund in the strat
    /// @notice this should increment the deposited token amount
    function deploy(address _token) external;

    /// @return it should return the amount withdrawn
    function withdrawTo(
        address _token,
        uint256 _amount,
        address _to
    ) external returns (uint256);

    /// @return it should return the amount withdrawn
    function emergencyWithdrawTo(address _token, address _to) external returns (uint256);

    /// @return the difference between amount deposited and balance to the _to address
    function collectProfits(address _token, address _to) external returns (int256);

    /// @return the addresses of the rewarded tokens
    function collectRewards(address _token, address _to)
        external
        returns (address[] memory);

    // @return the amount of funds deposited in the strategy before profits/losses
    function deposited(address _token) external view returns (uint256);

    // @return the balance of the strategy with gains
    function balance(address _token) external returns (uint256);
}
