// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../Policy.sol";
import "../librairies/FixedPoint256x256.sol";

import "../oracles/interfaces/AggregatorV3Interface.sol";
import "../interfaces/IOlympusTreasury.sol";
import "../interfaces/IStaking.sol";
import "../interfaces/IStakingHelper.sol";

contract wETHOlympusBondDepository is Policy {
    using FixedPoint256x256 for *;
    using SafeERC20 for IERC20;

    /* ======== EVENTS ======== */

    event BondCreated(
        uint256 deposit,
        uint256 indexed payout,
        uint256 indexed expires,
        uint256 indexed priceInUSD
    );
    event BondRedeemed(address indexed recipient, uint256 payout, uint256 remaining);
    event BondPriceChanged(
        uint256 indexed priceInUSD,
        uint256 indexed internalPrice,
        uint256 indexed debtRatio
    );
    event ControlVariableAdjustment(
        uint256 initialBCV,
        uint256 newBCV,
        uint256 adjustment,
        bool addition
    );

    /* ======== STATE VARIABLES ======== */

    address public immutable OHM; // token given as payment for bond
    address public immutable principle; // token used to create bond
    address public immutable treasury; // mints OHM when receives principle
    address public immutable DAO; // receives profit share from bond

    AggregatorV3Interface internal priceFeed;

    address public staking; // to auto-stake payout
    address public stakingHelper; // to stake and claim if no staking warmup
    bool public useHelper;

    Terms public terms; // stores terms for new bonds
    Adjust public adjustment; // stores adjustment to BCV data

    mapping(address => Bond) public bondInfo; // stores bond information for depositors

    uint256 public totalDebt; // total value of outstanding bonds; used for pricing
    uint256 public lastDecay; // reference block for debt decay

    /* ======== STRUCTS ======== */

    // Info for creating new bonds
    struct Terms {
        uint256 controlVariable; // scaling variable for price
        uint256 vestingTerm; // in blocks
        uint256 minimumPrice; // vs principle value. 4 decimals (1500 = 0.15)
        uint256 maxPayout; // in thousandths of a %. i.e. 500 = 0.5%
        uint256 maxDebt; // 9 decimal debt ratio, max % total supply created as debt
    }

    // Info for bond holder
    struct Bond {
        uint256 payout; // OHM remaining to be paid
        uint256 vesting; // Blocks left to vest
        uint256 lastBlock; // Last interaction
        uint256 pricePaid; // In DAI, for front end viewing
    }

    // Info for incremental adjustments to control variable
    struct Adjust {
        bool add; // addition or subtraction
        uint256 rate; // increment
        uint256 target; // BCV when adjustment finished
        uint256 buffer; // minimum length (in blocks) between adjustments
        uint256 lastBlock; // block when last adjustment made
    }

    /* ======== INITIALIZATION ======== */

    constructor(
        address _OHM,
        address _principle,
        address _treasury,
        address _DAO,
        address _feed
    ) {
        require(_OHM != address(0));
        OHM = _OHM;
        require(_principle != address(0));
        principle = _principle;
        require(_treasury != address(0));
        treasury = _treasury;
        require(_DAO != address(0));
        DAO = _DAO;
        require(_feed != address(0));
        priceFeed = AggregatorV3Interface(_feed);
    }

    /**
     *  @notice initializes bond parameters
     *  @param _controlVariable uint
     *  @param _vestingTerm uint
     *  @param _minimumPrice uint
     *  @param _maxPayout uint
     *  @param _maxDebt uint
     *  @param _initialDebt uint
     */
    function initializeBondTerms(
        uint256 _controlVariable,
        uint256 _vestingTerm,
        uint256 _minimumPrice,
        uint256 _maxPayout,
        uint256 _maxDebt,
        uint256 _initialDebt
    ) external onlyPolicy {
        require(terms.controlVariable == 0, "Debt must be 0 for initialization");
        terms = Terms({
            controlVariable: _controlVariable,
            vestingTerm: _vestingTerm,
            minimumPrice: _minimumPrice,
            maxPayout: _maxPayout,
            maxDebt: _maxDebt
        });
        totalDebt = _initialDebt;
        lastDecay = block.number;
    }

    /* ======== POLICY FUNCTIONS ======== */

    enum PARAMETER {
        VESTING,
        PAYOUT,
        DEBT,
        MINPRICE
    }

    /**
     *  @notice set parameters for new bonds
     *  @param _parameter PARAMETER
     *  @param _input uint
     */
    function setBondTerms(PARAMETER _parameter, uint256 _input) external onlyPolicy {
        if (_parameter == PARAMETER.VESTING) {
            // 0
            require(_input >= 10000, "Vesting must be longer than 36 hours");
            terms.vestingTerm = _input;
        } else if (_parameter == PARAMETER.PAYOUT) {
            // 1
            require(_input <= 1000, "Payout cannot be above 1 percent");
            terms.maxPayout = _input;
        } else if (_parameter == PARAMETER.DEBT) {
            // 2
            terms.maxDebt = _input;
        } else if (_parameter == PARAMETER.MINPRICE) {
            // 3
            terms.minimumPrice = _input;
        }
    }

    /**
     *  @notice set control variable adjustment
     *  @param _addition bool
     *  @param _increment uint
     *  @param _target uint
     *  @param _buffer uint
     */
    function setAdjustment(
        bool _addition,
        uint256 _increment,
        uint256 _target,
        uint256 _buffer
    ) external onlyPolicy {
        adjustment = Adjust({
            add: _addition,
            rate: _increment,
            target: _target,
            buffer: _buffer,
            lastBlock: block.number
        });
    }

    /**
     *  @notice set contract for auto stake
     *  @param _staking address
     *  @param _helper bool
     */
    function setStaking(address _staking, bool _helper) external onlyPolicy {
        require(_staking != address(0));
        if (_helper) {
            useHelper = true;
            stakingHelper = _staking;
        } else {
            useHelper = false;
            staking = _staking;
        }
    }

    /* ======== USER FUNCTIONS ======== */

    /**
     *  @notice deposit bond
     *  @param _amount uint
     *  @param _maxPrice uint
     *  @param _depositor address
     *  @return uint
     */
    function deposit(
        uint256 _amount,
        uint256 _maxPrice,
        address _depositor
    ) external returns (uint256) {
        require(_depositor != address(0), "Invalid address");

        decayDebt();
        require(totalDebt <= terms.maxDebt, "Max capacity reached");

        uint256 priceInUSD = bondPriceInUSD(); // Stored in bond info
        uint256 nativePrice = _bondPrice();

        require(_maxPrice >= nativePrice, "Slippage limit: more than max price"); // slippage protection

        uint256 value = (_amount * (10**IERC20Metadata(OHM).decimals())) /
            (10**IERC20Metadata(principle).decimals());
        uint256 payout = payoutFor(value); // payout to bonder is computed
        require(payout >= 10000000, "Bond too small"); // must be > 0.01 OHM ( underflow protection )
        require(payout <= maxPayout(), "Bond too large"); // size protection because there is no slippage

        /**
            asset carries risk and is not minted against
            asset transfered to treasury and rewards minted as payout
         */
        IERC20(principle).safeTransferFrom(msg.sender, treasury, _amount);
        IOlympusTreasury(treasury).mintRewards(address(this), payout);

        // total debt is increased
        totalDebt = totalDebt + value;

        // depositor info is stored
        bondInfo[_depositor] = Bond({
            payout: bondInfo[_depositor].payout + payout,
            vesting: terms.vestingTerm,
            lastBlock: block.number,
            pricePaid: priceInUSD
        });

        // indexed events are emitted
        emit BondCreated(_amount, payout, block.number + terms.vestingTerm, priceInUSD);
        emit BondPriceChanged(bondPriceInUSD(), _bondPrice(), debtRatio());

        adjust(); // control variable is adjusted
        return payout;
    }

    /**
     *  @notice redeem bond for user
     *  @param _recipient address
     *  @param _stake bool
     *  @return uint
     */
    function redeem(address _recipient, bool _stake) external returns (uint256) {
        Bond memory info = bondInfo[_recipient];
        uint256 percentVested = percentVestedFor(_recipient); // (blocks since last interaction / vesting term remaining)

        if (percentVested >= 10000) {
            // if fully vested
            delete bondInfo[_recipient]; // delete user info
            emit BondRedeemed(_recipient, info.payout, 0); // emit bond data
            return stakeOrSend(_recipient, _stake, info.payout); // pay user everything due
        } else {
            // if unfinished
            // calculate payout vested
            uint256 payout = (info.payout * percentVested) / 10000;

            // store updated deposit info
            bondInfo[_recipient] = Bond({
                payout: info.payout - payout,
                vesting: info.vesting - (block.number - info.lastBlock),
                lastBlock: block.number,
                pricePaid: info.pricePaid
            });

            emit BondRedeemed(_recipient, payout, bondInfo[_recipient].payout);
            return stakeOrSend(_recipient, _stake, payout);
        }
    }

    /* ======== INTERNAL HELPER FUNCTIONS ======== */

    /**
     *  @notice allow user to stake payout automatically
     *  @param _stake bool
     *  @param _amount uint
     *  @return uint
     */
    function stakeOrSend(
        address _recipient,
        bool _stake,
        uint256 _amount
    ) internal returns (uint256) {
        if (!_stake) {
            // if user does not want to stake
            IERC20(OHM).transfer(_recipient, _amount); // send payout
        } else {
            // if user wants to stake
            if (useHelper) {
                // use if staking warmup is 0
                IERC20(OHM).approve(stakingHelper, _amount);
                IStakingHelper(stakingHelper).stake(_amount, _recipient);
            } else {
                IERC20(OHM).approve(staking, _amount);
                IStaking(staking).stake(_amount, _recipient);
            }
        }
        return _amount;
    }

    /**
     *  @notice makes incremental adjustment to control variable
     */
    function adjust() internal {
        uint256 blockCanAdjust = adjustment.lastBlock + adjustment.buffer;
        if (adjustment.rate != 0 && block.number >= blockCanAdjust) {
            uint256 initial = terms.controlVariable;
            if (adjustment.add) {
                terms.controlVariable = terms.controlVariable + adjustment.rate;
                if (terms.controlVariable >= adjustment.target) {
                    adjustment.rate = 0;
                }
            } else {
                terms.controlVariable = terms.controlVariable - adjustment.rate;
                if (terms.controlVariable <= adjustment.target) {
                    adjustment.rate = 0;
                }
            }
            adjustment.lastBlock = block.number;
            emit ControlVariableAdjustment(
                initial,
                terms.controlVariable,
                adjustment.rate,
                adjustment.add
            );
        }
    }

    /**
     *  @notice reduce total debt
     */
    function decayDebt() internal {
        totalDebt = totalDebt - debtDecay();
        lastDecay = block.number;
    }

    /* ======== VIEW FUNCTIONS ======== */

    /**
     *  @notice determine maximum bond size
     *  @return uint
     */
    function maxPayout() public view returns (uint256) {
        return (IERC20(OHM).totalSupply() * terms.maxPayout) / 100000;
    }

    /**
     *  @notice calculate interest due for new bond
     *  @param _value uint
     *  @return uint
     */
    function payoutFor(uint256 _value) public view returns (uint256) {
        return FixedPoint256x256.fraction(_value, bondPrice()).decode112with18() / 1e14;
    }

    /**
     *  @notice calculate current bond premium
     *  @return price_ uint
     */
    function bondPrice() public view returns (uint256 price_) {
        price_ = (terms.controlVariable * debtRatio()) / 1e5;
        if (price_ < terms.minimumPrice) {
            price_ = terms.minimumPrice;
        }
    }

    /**
     *  @notice calculate current bond price and remove floor if above
     *  @return price_ uint
     */
    function _bondPrice() internal returns (uint256 price_) {
        price_ = (terms.controlVariable * debtRatio()) / 1e5;
        if (price_ < terms.minimumPrice) {
            price_ = terms.minimumPrice;
        } else if (terms.minimumPrice != 0) {
            terms.minimumPrice = 0;
        }
    }

    /**
     *  @notice get asset price from chainlink
     */
    function assetPrice() public view returns (int256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }

    /**
     *  @notice converts bond price to DAI value
     *  @return price_ uint
     */
    function bondPriceInUSD() public view returns (uint256 price_) {
        price_ = bondPrice() * uint256(assetPrice()) * 1e6;
    }

    /**
     *  @notice calculate current ratio of debt to OHM supply
     *  @return debtRatio_ uint
     */
    function debtRatio() public view returns (uint256 debtRatio_) {
        uint256 supply = IERC20(OHM).totalSupply();
        debtRatio_ =
            FixedPoint256x256.fraction(currentDebt() * 1e9, supply).decode112with18() /
            1e18;
    }

    /**
     *  @notice debt ratio in same terms as reserve bonds
     *  @return uint
     */
    function standardizedDebtRatio() external view returns (uint256) {
        return (debtRatio() * uint256(assetPrice())) / 1e8; // ETH feed is 8 decimals
    }

    /**
     *  @notice calculate debt factoring in decay
     *  @return uint
     */
    function currentDebt() public view returns (uint256) {
        return totalDebt - debtDecay();
    }

    /**
     *  @notice amount to decay total debt by
     *  @return decay_ uint
     */
    function debtDecay() public view returns (uint256 decay_) {
        uint256 blocksSinceLast = block.number - lastDecay;
        decay_ = (totalDebt * blocksSinceLast) / terms.vestingTerm;
        if (decay_ > totalDebt) {
            decay_ = totalDebt;
        }
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
        uint256 blocksSinceLast = block.number - bond.lastBlock;
        uint256 vesting = bond.vesting;

        if (vesting > 0) {
            percentVested_ = (blocksSinceLast * 10000) / vesting;
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
            pendingPayout_ = (payout * percentVested) / 10000;
        }
    }

    /* ======= AUXILLIARY ======= */

    /**
     *  @notice allow anyone to send lost tokens (excluding principle or OHM) to the DAO
     *  @return bool
     */
    function recoverLostToken(address _token) external returns (bool) {
        require(_token != OHM);
        require(_token != principle);
        IERC20(_token).safeTransfer(DAO, IERC20(_token).balanceOf(address(this)));
        return true;
    }
}
