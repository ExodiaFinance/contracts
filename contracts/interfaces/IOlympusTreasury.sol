// SPDX-License-Identifier: MIT
pragma solidity >=0.7.5;

enum MANAGING {
    RESERVEDEPOSITOR,
    RESERVESPENDER,
    RESERVETOKEN,
    RESERVEMANAGER,
    LIQUIDITYDEPOSITOR,
    LIQUIDITYTOKEN,
    LIQUIDITYMANAGER,
    DEBTOR,
    REWARDMANAGER,
    SOHM
}

interface IOlympusTreasury {
    function manage(address _token, uint256 _amount) external;
    function withdraw(uint256 _amount, address _token) external;
    function deposit(
        uint256 _amount,
        address _token,
        uint256 _profit
    ) external returns (uint256);
    function valueOf(address _token, uint256 _amount) external view returns (uint256 );
    function queue(MANAGING _managing, address _address) external returns (bool);
    function toggle(
        MANAGING _managing,
        address _address,
        address _calculator
    ) external returns (bool);
    function isReserveToken(address _token) external view returns(bool);
    function isLiquidityToken(address _token) external view returns(bool);
}
