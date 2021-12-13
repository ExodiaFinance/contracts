interface IPolicy {
    function policy() external view returns (address);

    function renounceManagement() external;

    function pushManagement( address newOwner_ ) external;

    function pullManagement() external;
}
