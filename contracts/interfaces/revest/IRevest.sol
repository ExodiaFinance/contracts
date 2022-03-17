// SPDX-License-Identifier: GNU-GPL v3.0 or later

pragma solidity >=0.8.0;

interface IRevest {
    event FNFTTimeLockMinted(
        address indexed asset,
        address indexed from,
        uint256 indexed fnftId,
        uint256 endTime,
        uint256[] quantities,
        FNFTConfig fnftConfig
    );

    event FNFTValueLockMinted(
        address indexed primaryAsset,
        address indexed from,
        uint256 indexed fnftId,
        address compareTo,
        address oracleDispatch,
        uint256[] quantities,
        FNFTConfig fnftConfig
    );

    event FNFTAddressLockMinted(
        address indexed asset,
        address indexed from,
        uint256 indexed fnftId,
        address trigger,
        uint256[] quantities,
        FNFTConfig fnftConfig
    );

    event FNFTWithdrawn(
        address indexed from,
        uint256 indexed fnftId,
        uint256 indexed quantity
    );

    event FNFTSplit(
        address indexed from,
        uint256[] indexed newFNFTId,
        uint256[] indexed proportions,
        uint256 quantity
    );

    event FNFTUnlocked(address indexed from, uint256 indexed fnftId);

    event FNFTMaturityExtended(
        address indexed from,
        uint256 indexed fnftId,
        uint256 indexed newExtendedTime
    );

    event FNFTAddionalDeposited(
        address indexed from,
        uint256 indexed newFNFTId,
        uint256 indexed quantity,
        uint256 amount
    );

    struct FNFTConfig {
        address asset; // The token being stored
        address pipeToContract; // Indicates if FNFT will pipe to another contract
        uint256 depositAmount; // How many tokens
        uint256 depositMul; // Deposit multiplier
        uint256 split; // Number of splits remaining
        uint256 depositStopTime; //
        bool maturityExtension; // Maturity extensions remaining
        bool isMulti; //
        bool nontransferrable; // False by default (transferrable) //
    }

    // Refers to the global balance for an ERC20, encompassing possibly many FNFTs
    struct TokenTracker {
        uint256 lastBalance;
        uint256 lastMul;
    }

    enum LockType {
        DoesNotExist,
        TimeLock,
        ValueLock,
        AddressLock
    }

    struct LockParam {
        address addressLock;
        uint256 timeLockExpiry;
        LockType lockType;
        ValueLock valueLock;
    }

    struct Lock {
        address addressLock;
        LockType lockType;
        ValueLock valueLock;
        uint256 timeLockExpiry;
        uint256 creationTime;
        bool unlocked;
    }

    struct ValueLock {
        address asset;
        address compareTo;
        address oracle;
        uint256 unlockValue;
        bool unlockRisingEdge;
    }

    function mintTimeLock(
        uint256 endTime,
        address[] memory recipients,
        uint256[] memory quantities,
        IRevest.FNFTConfig memory fnftConfig
    ) external payable returns (uint256);

    function mintValueLock(
        address primaryAsset,
        address compareTo,
        uint256 unlockValue,
        bool unlockRisingEdge,
        address oracleDispatch,
        address[] memory recipients,
        uint256[] memory quantities,
        IRevest.FNFTConfig memory fnftConfig
    ) external payable returns (uint256);

    function mintAddressLock(
        address trigger,
        bytes memory arguments,
        address[] memory recipients,
        uint256[] memory quantities,
        IRevest.FNFTConfig memory fnftConfig
    ) external payable returns (uint256);

    function withdrawFNFT(uint256 tokenUID, uint256 quantity) external;

    function unlockFNFT(uint256 tokenUID) external;

    function splitFNFT(
        uint256 fnftId,
        uint256[] memory proportions,
        uint256 quantity
    ) external returns (uint256[] memory newFNFTIds);

    function depositAdditionalToFNFT(
        uint256 fnftId,
        uint256 amount,
        uint256 quantity
    ) external returns (uint256);

    function setFlatWeiFee(uint256 wethFee) external;

    function setERC20Fee(uint256 erc20) external;

    function getFlatWeiFee() external returns (uint256);

    function getERC20Fee() external returns (uint256);
}
