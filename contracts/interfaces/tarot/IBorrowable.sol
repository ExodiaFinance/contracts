// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;

interface IBorrowable {
    function name() external pure returns (string memory);

    function symbol() external pure returns (string memory);

    function decimals() external pure returns (uint8);

    function totalSupply() external view returns (uint256);

    function balanceOf(address owner) external view returns (uint256);

    function allowance(address owner, address spender) external view returns (uint256);

    function approve(address spender, uint256 value) external returns (bool);

    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);

    function DOMAIN_SEPARATOR() external view returns (bytes32);

    function PERMIT_TYPEHASH() external pure returns (bytes32);

    function nonces(address owner) external view returns (uint256);

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function underlying() external view returns (address);

    function factory() external view returns (address);

    function totalBalance() external view returns (uint256);

    function MINIMUM_LIQUIDITY() external pure returns (uint256);

    function exchangeRate() external returns (uint256);

    function mint(address minter) external returns (uint256 mintTokens);

    function redeem(address redeemer) external returns (uint256 redeemAmount);

    function skim(address to) external;

    function sync() external;

    function _setFactory() external;

    function BORROW_FEE() external pure returns (uint256);

    function collateral() external view returns (address);

    function reserveFactor() external view returns (uint256);

    function exchangeRateLast() external view returns (uint256);

    function borrowIndex() external view returns (uint256);

    function totalBorrows() external view returns (uint256);

    function borrowAllowance(address owner, address spender)
        external
        view
        returns (uint256);

    function borrowBalance(address borrower) external view returns (uint256);

    function borrowTracker() external view returns (address);

    function BORROW_PERMIT_TYPEHASH() external pure returns (bytes32);

    function borrowApprove(address spender, uint256 value) external returns (bool);

    function borrowPermit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function borrow(
        address borrower,
        address receiver,
        uint256 borrowAmount,
        bytes calldata data
    ) external;

    function liquidate(address borrower, address liquidator)
        external
        returns (uint256 seizeTokens);

    function trackBorrow(address borrower) external;

    function KINK_BORROW_RATE_MAX() external pure returns (uint256);

    function KINK_BORROW_RATE_MIN() external pure returns (uint256);

    function KINK_MULTIPLIER() external pure returns (uint256);

    function borrowRate() external view returns (uint256);

    function kinkBorrowRate() external view returns (uint256);

    function kinkUtilizationRate() external view returns (uint256);

    function adjustSpeed() external view returns (uint256);

    function rateUpdateTimestamp() external view returns (uint32);

    function accrualTimestamp() external view returns (uint32);

    function accrueInterest() external;

    function RESERVE_FACTOR_MAX() external pure returns (uint256);

    function KINK_UR_MIN() external pure returns (uint256);

    function KINK_UR_MAX() external pure returns (uint256);

    function ADJUST_SPEED_MIN() external pure returns (uint256);

    function ADJUST_SPEED_MAX() external pure returns (uint256);

    function _initialize(
        string calldata _name,
        string calldata _symbol,
        address _underlying,
        address _collateral
    ) external;

    function _setReserveFactor(uint256 newReserveFactor) external;

    function _setKinkUtilizationRate(uint256 newKinkUtilizationRate) external;

    function _setAdjustSpeed(uint256 newAdjustSpeed) external;

    function _setBorrowTracker(address newBorrowTracker) external;
}
