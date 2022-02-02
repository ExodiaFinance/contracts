// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IBeethovenxMasterChef {
    struct UserInfo {
        uint256 amount; // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
    }

    function harvest(uint256 _pid, address _to) external;

    function deposit(
        uint256 _pid,
        uint256 _amount,
        address _to
    ) external;

    function pendingBeets(uint256 _pid, address _user)
        external
        view
        returns (uint256 pending);

    function withdrawAndHarvest(
        uint256 _pid,
        uint256 _amount,
        address _to
    ) external;

    function userInfo(uint256 _pid, address _user)
        external
        view
        returns (UserInfo memory);
}

interface IBeethovenVault {
    enum SwapKind {
        GIVEN_IN,
        GIVEN_OUT
    }
    enum JoinKind {
        INIT,
        EXACT_TOKENS_IN_FOR_BPT_OUT,
        TOKEN_IN_FOR_EXACT_BPT_OUT,
        ALL_TOKENS_IN_FOR_EXACT_BPT_OUT
    }

    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }

    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }

    struct JoinPoolRequest {
        address[] assets;
        uint256[] maxAmountsIn;
        bytes userData;
        bool fromInternalBalance;
    }

    function joinPool(
        bytes32 poolId,
        address sender,
        address recipient,
        JoinPoolRequest memory request
    ) external payable;

    function getPoolTokens(bytes32 poolId)
        external
        view
        returns (
            address[] memory tokens,
            uint256[] memory balances,
            uint256 lastChangeBlock
        );

    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

/**
 * @dev Simple contract that helps to compound farming of a specific balancer pool
 * investment. The contract itself must hold the initial LP, farmed token (BEETS),
 * or base token (wFTM).
 */
contract MonolithAutoCompounder is Ownable {
    using SafeERC20 for IERC20;

    uint256 private immutable pid = 37; // this is the masterchef pool id
    IBeethovenxMasterChef private immutable beetsChef =
        IBeethovenxMasterChef(0x8166994d9ebBe5829EC86Bd81258149B87faCfd3);
    IBeethovenVault private immutable beetsVault =
        IBeethovenVault(0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce);
    IERC20 private immutable beets =
        IERC20(0xF24Bcf4d1e507740041C9cFd2DddB29585aDCe1e);
    IERC20 private immutable wftm =
        IERC20(0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83);
    IERC20 private immutable bptmnlt =
        IERC20(0xa216AA5d67Ef95DdE66246829c5103C7843d1AAB);
    bytes32 private immutable beetsSwapPoolId =
        0xcde5a11a4acb4ee4c805352cec57e236bdbc3837000200000000000000000019; // BEETS-wFTM pool
    bytes32 private immutable monolithPoolId =
        0xa216aa5d67ef95dde66246829c5103c7843d1aab000100000000000000000112; // MAI-wsEXOD-gOHM-EXOD-wFTM

    /****** VIEW METHODS ******/

    function beetsBalance() public view returns (uint256) {
        return beets.balanceOf(address(this));
    }

    function lpBalance() public view returns (uint256) {
        return bptmnlt.balanceOf(address(this));
    }

    function pendingBeets() public view returns (uint256) {
        return beetsChef.pendingBeets(pid, address(this));
    }

    function wFTMBalance() public view returns (uint256) {
        return wftm.balanceOf(address(this));
    }

    /****** OPERATIONS ******/

    /**
     * @dev It's rather simple:
     *
     * 1) First we harvest our BEETs from the MasterChef farm
     * 2) Then we swap the BEETs for wFTM
     * 3) Then we invest the wFTM back in the pool (single-asset style)
     * 4) Then we deposit the resulting LP back into the MasterChef farm
     */
    function compound() public {
        _harvest();

        _swapBeetsForwFTM();

        _joinPool();

        _farmBeets();
    }

    /**
     * @dev Pulls everything out of the contract
     */
    function withdraw() public onlyOwner {
        _unfarmBeets();
        _withdraw(wftm);
        _withdraw(beets);
        _withdraw(bptmnlt);
        _withdrawNative();
    }

    /**
     * @dev Pulls the balance of a specific token out of the contract
     */
    function withdraw(address token) public onlyOwner {
        _withdraw(IERC20(token));
    }

    /**
     * @dev Pulls the native balance out of the contract
     */
    function withdrawNative() public onlyOwner {
        _withdrawNative();
    }

    /****** INTERNAL METHODS ******/

    function _withdraw(IERC20 token) internal {
        if (token.balanceOf(address(this)) != 0) {
            token.transfer(msg.sender, token.balanceOf(address(this)));
        }
    }

    function _withdrawNative() internal {
        if (address(this).balance != 0) {
            payable(_msgSender()).transfer(address(this).balance);
        }
    }

    function _farmBeets() internal {
        uint256 balance = lpBalance();

        if (balance != 0) {
            bptmnlt.approve(address(beetsChef), lpBalance()); // approve the chef to use our lp

            beetsChef.deposit(pid, balance, address(this)); // deposit the lp into the farm
        }
    }

    function _harvest() internal {
        if (beetsChef.pendingBeets(pid, address(this)) != 0) {
            beetsChef.harvest(pid, address(this)); // harvest our beets
        }
    }

    function _joinPool() internal {
        uint256 balance = wFTMBalance();

        if (balance != 0) {
            wftm.approve(address(beetsVault), wFTMBalance()); // approve the vault to spend the wFTM we have

            (address[] memory poolAssets, , ) = beetsVault.getPoolTokens(
                monolithPoolId
            );

            uint256[] memory amountsIn = new uint256[](poolAssets.length);

            for (uint256 i = 0; i < poolAssets.length; i++) {
                if (poolAssets[i] == address(wftm)) {
                    amountsIn[i] = balance; // found our match, that's the one, insert our balance
                }
            }

            // invest the wFTM into the pool
            beetsVault.joinPool(
                monolithPoolId,
                address(this),
                address(this),
                IBeethovenVault.JoinPoolRequest({
                    assets: poolAssets,
                    maxAmountsIn: amountsIn,
                    userData: abi.encode(
                        IBeethovenVault.JoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT,
                        amountsIn,
                        0
                    ),
                    fromInternalBalance: false
                })
            );
        }
    }

    function _swapBeetsForwFTM() internal {
        uint256 balance = beetsBalance();

        if (balance != 0) {
            beets.approve(address(beetsVault), beetsBalance()); // approve the vault to spend the beets we have

            // swap the beets to wFTM using the simple swap mechanism
            beetsVault.swap(
                IBeethovenVault.SingleSwap({
                    poolId: beetsSwapPoolId,
                    kind: IBeethovenVault.SwapKind.GIVEN_IN,
                    assetIn: address(beets),
                    assetOut: address(wftm),
                    amount: beetsBalance(),
                    userData: ""
                }),
                IBeethovenVault.FundManagement({
                    sender: address(this),
                    fromInternalBalance: false,
                    recipient: payable(address(this)),
                    toInternalBalance: false
                }),
                0, // we will take whatever we can get
                type(uint256).max
            );
        }
    }

    function _unfarmBeets() internal {
        IBeethovenxMasterChef.UserInfo memory info = beetsChef.userInfo(
            pid,
            address(this)
        );

        if (info.amount != 0) {
            beetsChef.withdrawAndHarvest(pid, info.amount, address(this)); // withdraw our lp from the farm
        }
    }

    receive() external payable {}
}
