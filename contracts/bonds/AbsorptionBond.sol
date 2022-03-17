// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../librairies/FixedPoint.sol";
import "../Policy.sol";

contract AbsorptionBond is Policy {
    using FixedPoint for *;
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    /* ======== EVENTS ======== */

    event BondCreated(uint256 deposit, uint256 indexed payout, uint256 indexed expires);
    event BondRedeemed(address indexed recipient, uint256 payout, uint256 remaining);

    /* ======== STATE VARIABLES ======== */

    address public immutable OHM; // token given as payment for bond
    address public immutable principle; // token used to create bond
    address public immutable DAO;

    mapping(address => Bond) public bondInfo; // stores bond information for depositors

    /* ======== STRUCTS ======== */

    uint256 public vestingTerm; // in blocks
    uint256 public seedAmount;
    uint256 public bondedAmount = 0;
    uint256 public endsAt = 0;

    // Info for bond holder
    struct Bond {
        uint256 payout; // OHM remaining to be paid
        uint256 vesting; // Blocks left to vest
        uint256 lastBlock; // Last interaction
        uint256 pricePaid; // In principle, for front end viewing
    }

    /* ======== INITIALIZATION ======== */

    constructor(
        address _OHM,
        address _principle,
        address _DAO
    ) {
        require(_OHM != address(0));
        OHM = _OHM;
        require(_principle != address(0));
        principle = _principle;
        require(_DAO != address(0));
        DAO = _DAO;
    }

    /**
     *  @notice initializes bond parameters
     *  @param _quantity uint quantity to seed the contract
     *  @param _vestingTerm uint
     */
    function seed(
        uint256 _quantity,
        uint256 _vestingTerm,
        uint16 _validForDays
    ) external onlyPolicy {
        require(endsAt == 0, "Bond already seeded");
        endsAt = block.timestamp + _validForDays * 1 days;
        vestingTerm = _vestingTerm;
        seedAmount = _quantity;
        IERC20(OHM).transferFrom(msg.sender, address(this), _quantity);
    }

    /* ======== USER FUNCTIONS ======== */

    /**
     *  @notice deposit bond
     *  @param _amount uint
     *  @param _depositor address
     *  @return uint
     */
    function deposit(uint256 _amount, address _depositor) external returns (uint256) {
        require(endsAt != 0, "Bond is not open yet");
        require(block.timestamp < endsAt, "Bonding period is done");
        require(_depositor != address(0), "Invalid address");

        uint256 payout = payoutFor(_amount); // payout to bonder is computed
        bondedAmount += payout;
        // depositor info is stored
        bondInfo[_depositor] = Bond({
            payout: bondInfo[_depositor].payout.add(payout),
            vesting: vestingTerm,
            lastBlock: block.number,
            pricePaid: _amount
        });
        IERC20(principle).transferFrom(msg.sender, address(this), _amount);
        // indexed events are emitted
        emit BondCreated(_amount, payout, block.number.add(vestingTerm));

        return payout;
    }

    /**
     *  @notice redeem bond for user
     *  @param _recipient address
     *  @return uint
     */
    function redeem(address _recipient) external returns (uint256) {
        Bond memory info = bondInfo[_recipient];
        uint256 percentVested = percentVestedFor(_recipient); // (blocks since last interaction / vesting term remaining)
        if (percentVested >= 10000) {
            // if fully vested
            delete bondInfo[_recipient]; // delete user info
            emit BondRedeemed(_recipient, info.payout, 0); // emit bond data
            IERC20(OHM).transfer(_recipient, info.payout); // pay user everything due
            return info.payout;
        } else if (percentVested > 0) {
            // if unfinished
            // calculate payout vested
            uint256 payout = info.payout.mul(percentVested).div(10000);

            // store updated deposit info
            bondInfo[_recipient] = Bond({
                payout: info.payout.sub(payout),
                vesting: info.vesting.sub(block.number.sub(info.lastBlock)),
                lastBlock: block.number,
                pricePaid: info.pricePaid
            });

            emit BondRedeemed(_recipient, payout, bondInfo[_recipient].payout);
            IERC20(OHM).transfer(_recipient, payout);
            return payout;
        }
        return 0;
    }

    function recoverUnclaimed() external {
        require(block.timestamp > endsAt, "bonding period is not done");
        IERC20(OHM).transfer(DAO, seedAmount - bondedAmount);
    }

    /* ======== VIEW FUNCTIONS ======== */

    /**
     *  @notice calculate payout for a bond in principles term
     *  @param _value uint
     *  @return uint
     */
    function payoutFor(uint256 _value) public view returns (uint256) {
        return _value.mul(10**ERC20(OHM).decimals()).div(_bondPrice());
    }

    /**
     *  @notice calculate current bond premium
     *  @return price_ uint
     */
    function bondPrice() public view returns (uint256) {
        return _bondPrice();
    }

    /**
     *  @notice calculate current bond price in principle terms OHM/pinciple
     *  @return price_ uint
     */
    function _bondPrice() internal view returns (uint256) {
        return
            ERC20(principle).totalSupply().mul(10**ERC20(OHM).decimals()).div(seedAmount);
    }

    /**
     *  @notice calculate how far into vesting a depositor is
     *  @param _depositor address
     *  @return percentVested_ uint
     */
    function percentVestedFor(address _depositor)
        public
        view
        returns (uint256 percentVested_)
    {
        Bond memory bond = bondInfo[_depositor];
        uint256 blocksSinceLast = block.number.sub(bond.lastBlock);
        uint256 vesting = bond.vesting;

        if (vesting > 0) {
            percentVested_ = blocksSinceLast.mul(10000).div(vesting);
        } else {
            percentVested_ = 0;
        }
    }

    /**
     *  @notice calculate amount of OHM available for claim by depositor
     *  @param _depositor address
     *  @return pendingPayout_ uint
     */
    function pendingPayoutFor(address _depositor)
        external
        view
        returns (uint256 pendingPayout_)
    {
        uint256 percentVested = percentVestedFor(_depositor);
        uint256 payout = bondInfo[_depositor].payout;

        if (percentVested >= 10000) {
            pendingPayout_ = payout;
        } else {
            pendingPayout_ = payout.mul(percentVested).div(10000);
        }
    }

    /* ======= AUXILLIARY ======= */

    /**
     *  @notice allow anyone to send lost tokens to the DAO
     *  @return bool
     */
    function recoverLostToken(address _token) external returns (bool) {
        require(_token != OHM);
        IERC20(_token).safeTransfer(DAO, IERC20(_token).balanceOf(address(this)));
        return true;
    }
}
