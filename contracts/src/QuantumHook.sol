// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import "./QuantumRegistry.sol";

/**
 * @title QuantumHook
 * @dev Uniswap V4 Hook implementing quantum-safe gating and dynamic fees
 * @notice The "Traffic Light" economic model - verified users pay 0.15%, bots pay 0.40%
 */
contract QuantumHook is IHooks {
    using PoolIdLibrary for PoolKey;

    // Quantum Registry for identity verification
    QuantumRegistry public immutable registry;
    
    // Pool Manager
    IPoolManager public immutable poolManager;

    // Fee tiers (in hundredths of basis points)
    uint24 public constant QUANTUM_FEE = 1500; // 0.15% for verified users
    uint24 public constant LEGACY_FEE = 4000;  // 0.40% for bots/legacy

    // Pool creation settings
    bool public requireQuantumForPoolCreation = true;

    // Events
    event PoolCreatedByQuantumUser(PoolId indexed poolId, address indexed creator);
    event SwapWithQuantumDiscount(address indexed swapper, uint24 fee);
    event SwapWithLegacyPenalty(address indexed swapper, uint24 fee);
    event LiquidityAddedByQuantumUser(address indexed provider, PoolId indexed poolId);

    // Errors
    error OnlyQuantumUsersCanCreatePools();
    error OnlyQuantumUsersCanAddLiquidity();
    error OnlyQuantumUsersCanRemoveLiquidity();
    error NotPoolManager();

    // Modifier to ensure only pool manager can call
    modifier onlyPoolManager() {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        _;
    }

    constructor(IPoolManager _poolManager, QuantumRegistry _registry) {
        poolManager = _poolManager;
        registry = _registry;
    }

    /**
     * @dev Get hook permissions
     */
    function getHookPermissions() external pure returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: true,
            afterInitialize: false,
            beforeAddLiquidity: true,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: true,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    /**
     * @dev Hook: Before Pool Initialization (Feature A - Pool Creation Gating)
     * @notice Only quantum-safe users can create pools
     */
    function beforeInitialize(
        address sender,
        PoolKey calldata key,
        uint160 sqrtPriceX96
    ) external override onlyPoolManager returns (bytes4) {
        // Check if pool creator is quantum-safe
        if (requireQuantumForPoolCreation && !registry.isQuantumSafe(sender)) {
            revert OnlyQuantumUsersCanCreatePools();
        }

        emit PoolCreatedByQuantumUser(key.toId(), sender);
        
        return IHooks.beforeInitialize.selector;
    }

    /**
     * @dev Hook: After Initialize (not used)
     */
    function afterInitialize(
        address,
        PoolKey calldata,
        uint160,
        int24
    ) external pure override returns (bytes4) {
        return IHooks.afterInitialize.selector;
    }

    /**
     * @dev Hook: Before Add Liquidity (Feature B - Liquidity Gating)
     * @notice Only quantum-safe users can add liquidity
     */
    function beforeAddLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) external override onlyPoolManager returns (bytes4) {
        // Verify sender is quantum-safe
        if (!registry.isQuantumSafe(sender)) {
            revert OnlyQuantumUsersCanAddLiquidity();
        }

        emit LiquidityAddedByQuantumUser(sender, key.toId());
        
        return IHooks.beforeAddLiquidity.selector;
    }

    /**
     * @dev Hook: After Add Liquidity (not used)
     */
    function afterAddLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure override returns (bytes4, BalanceDelta) {
        return (IHooks.afterAddLiquidity.selector, BalanceDeltaLibrary.ZERO_DELTA);
    }

    /**
     * @dev Hook: Before Remove Liquidity (Feature B - Secure Withdrawal)
     * @notice Only quantum-safe users can remove liquidity
     */
    function beforeRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) external override onlyPoolManager returns (bytes4) {
        // Verify sender is quantum-safe
        if (!registry.isQuantumSafe(sender)) {
            revert OnlyQuantumUsersCanRemoveLiquidity();
        }

        return IHooks.beforeRemoveLiquidity.selector;
    }

    /**
     * @dev Hook: After Remove Liquidity (not used)
     */
    function afterRemoveLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure override returns (bytes4, BalanceDelta) {
        return (IHooks.afterRemoveLiquidity.selector, BalanceDeltaLibrary.ZERO_DELTA);
    }

    /**
     * @dev Hook: Before Swap (Feature C - Dynamic Fee Structure)
     * @notice Apply tiered fees based on quantum status
     */
    function beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata hookData
    ) external override onlyPoolManager returns (bytes4, BeforeSwapDelta, uint24) {
        // Determine fee based on quantum status
        uint24 dynamicFee;
        
        if (registry.isQuantumSafe(sender)) {
            // Verified quantum user gets discount
            dynamicFee = QUANTUM_FEE;
            emit SwapWithQuantumDiscount(sender, dynamicFee);
        } else {
            // Legacy/bot user pays penalty
            dynamicFee = LEGACY_FEE;
            emit SwapWithLegacyPenalty(sender, dynamicFee);
        }

        // Return: selector, no delta, dynamic fee
        return (
            IHooks.beforeSwap.selector,
            BeforeSwapDeltaLibrary.ZERO_DELTA,
            dynamicFee
        );
    }

    /**
     * @dev Hook: After Swap (not used)
     */
    function afterSwap(
        address,
        PoolKey calldata,
        IPoolManager.SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) external pure override returns (bytes4, int128) {
        return (IHooks.afterSwap.selector, 0);
    }

    /**
     * @dev Hook: Before Donate (not used)
     */
    function beforeDonate(
        address,
        PoolKey calldata,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IHooks.beforeDonate.selector;
    }

    /**
     * @dev Hook: After Donate (not used)
     */
    function afterDonate(
        address,
        PoolKey calldata,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IHooks.afterDonate.selector;
    }

    /**
     * @dev Get the fee for a specific user
     * @param user The address to check
     * @return The fee tier for this user
     */
    function getUserFee(address user) external view returns (uint24) {
        return registry.isQuantumSafe(user) ? QUANTUM_FEE : LEGACY_FEE;
    }

    /**
     * @dev Check if a user can create pools
     * @param user The address to check
     * @return True if user can create pools
     */
    function canCreatePool(address user) external view returns (bool) {
        if (!requireQuantumForPoolCreation) {
            return true;
        }
        return registry.isQuantumSafe(user);
    }
}

// Helper library for BalanceDelta
library BalanceDeltaLibrary {
    BalanceDelta internal constant ZERO_DELTA = BalanceDelta.wrap(0);
}
