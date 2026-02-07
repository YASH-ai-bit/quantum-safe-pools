// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import "./QuantumSystem.sol";

/// @title QuantumDynamicFeeHook
/// @notice A Uniswap v4 hook that implements dynamic fees for privacy-preserving,
///         MEV-resistant swaps with quantum-registered user benefits.
/// @dev Fees are adjusted based on:
///      1. Quantum registration status (lower fees for registered users)
///      2. Volatility detection (higher fees during volatile periods)
///      3. Trade size (larger trades = higher fees to deter MEV)
contract QuantumDynamicFeeHook is IHooks {
    using PoolIdLibrary for PoolKey;
    using LPFeeLibrary for uint24;
    using StateLibrary for IPoolManager;

    // ============ Constants ============
    
    /// @notice Base fee for quantum-registered users (0.1% = 1000 in 1e6 basis)
    uint24 public constant FEE_REGISTERED = 1000; // 0.1%
    
    /// @notice Base fee for standard users (0.3% = 3000 in 1e6 basis)
    uint24 public constant FEE_STANDARD = 3000; // 0.3%
    
    /// @notice Maximum fee during high volatility (1% = 10000 in 1e6 basis)
    uint24 public constant FEE_MAX = 10000; // 1%
    
    /// @notice Minimum fee for any swap (0.05% = 500 in 1e6 basis)
    uint24 public constant FEE_MIN = 500; // 0.05%
    
    /// @notice Volatility threshold in basis points (5% price change triggers high volatility)
    uint256 public constant VOLATILITY_THRESHOLD = 500;

    // ============ State ============
    
    /// @notice Reference to the PoolManager
    IPoolManager public immutable poolManager;
    
    /// @notice Reference to the QuantumSystem for registration checks
    QuantumSystem public immutable quantumSystem;
    
    /// @notice Last recorded sqrtPriceX96 for each pool
    mapping(PoolId => uint160) public lastSqrtPrice;
    
    /// @notice Current volatility level (0-100) for each pool
    mapping(PoolId => uint256) public volatilityLevel;

    // ============ Events ============
    
    event DynamicFeeApplied(
        PoolId indexed poolId,
        address indexed trader,
        uint24 fee,
        bool isQuantumRegistered,
        uint256 volatilityLevel
    );
    
    event VolatilityUpdated(
        PoolId indexed poolId,
        uint160 oldPrice,
        uint160 newPrice,
        uint256 newVolatilityLevel
    );

    // ============ Errors ============
    
    error HookNotImplemented();

    // ============ Constructor ============
    
    constructor(IPoolManager _poolManager, address _quantumSystem) {
        poolManager = _poolManager;
        quantumSystem = QuantumSystem(_quantumSystem);
    }

    // ============ Hook Callbacks ============

    /// @notice Called before pool initialization - not used
    function beforeInitialize(address, PoolKey calldata, uint160) external pure returns (bytes4) {
        revert HookNotImplemented();
    }

    /// @notice Initialize price tracking when pool is created
    function afterInitialize(
        address,
        PoolKey calldata key,
        uint160 sqrtPriceX96,
        int24
    ) external returns (bytes4) {
        PoolId poolId = key.toId();
        lastSqrtPrice[poolId] = sqrtPriceX96;
        volatilityLevel[poolId] = 0;
        return IHooks.afterInitialize.selector;
    }

    /// @notice Calculate and return dynamic fee before swap
    function beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata
    ) external returns (bytes4, BeforeSwapDelta, uint24) {
        PoolId poolId = key.toId();
        
        // Check if trader is quantum-registered
        bool isRegistered = quantumSystem.isRegistered(sender) || 
                           quantumSystem.isRegistered(tx.origin);
        
        // Get base fee based on registration status
        uint24 baseFee = isRegistered ? FEE_REGISTERED : FEE_STANDARD;
        
        // Adjust for volatility (0-100 scale adds 0-7000 bps)
        uint24 volatilityAdjustment = uint24((volatilityLevel[poolId] * 70));
        
        // Calculate trade size impact (larger trades get higher fees for MEV protection)
        uint24 sizeAdjustment = _calculateSizeAdjustment(params.amountSpecified);
        
        // Calculate final fee
        uint24 dynamicFee = baseFee + volatilityAdjustment + sizeAdjustment;
        
        // Clamp to min/max
        if (dynamicFee < FEE_MIN) dynamicFee = FEE_MIN;
        if (dynamicFee > FEE_MAX) dynamicFee = FEE_MAX;
        
        // Update the pool's dynamic LP fee
        poolManager.updateDynamicLPFee(key, dynamicFee);
        
        emit DynamicFeeApplied(poolId, sender, dynamicFee, isRegistered, volatilityLevel[poolId]);
        
        return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    /// @notice Update volatility tracking after swap
    function afterSwap(
        address,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) external returns (bytes4, int128) {
        PoolId poolId = key.toId();
        
        // Get current price from pool's slot0 using StateLibrary
        (uint160 currentSqrtPrice,,,) = poolManager.getSlot0(poolId);
        uint160 oldSqrtPrice = lastSqrtPrice[poolId];
        
        if (oldSqrtPrice > 0) {
            // Calculate price change in basis points
            uint256 priceChange;
            if (currentSqrtPrice > oldSqrtPrice) {
                priceChange = uint256(currentSqrtPrice - oldSqrtPrice) * 10000 / oldSqrtPrice;
            } else {
                priceChange = uint256(oldSqrtPrice - currentSqrtPrice) * 10000 / oldSqrtPrice;
            }
            
            // Update volatility level
            if (priceChange > VOLATILITY_THRESHOLD) {
                // High volatility detected - increase level
                uint256 newVolatility = volatilityLevel[poolId] + 20;
                if (newVolatility > 100) newVolatility = 100;
                volatilityLevel[poolId] = newVolatility;
            } else if (volatilityLevel[poolId] > 0) {
                // Decay volatility slowly
                volatilityLevel[poolId] = volatilityLevel[poolId] > 5 
                    ? volatilityLevel[poolId] - 5 
                    : 0;
            }
            
            emit VolatilityUpdated(poolId, oldSqrtPrice, currentSqrtPrice, volatilityLevel[poolId]);
        }
        
        // Update price tracking
        lastSqrtPrice[poolId] = currentSqrtPrice;
        
        return (IHooks.afterSwap.selector, 0);
    }

    // ============ Not Implemented Hooks ============

    function beforeAddLiquidity(address, PoolKey calldata, IPoolManager.ModifyLiquidityParams calldata, bytes calldata) 
        external pure returns (bytes4) {
        revert HookNotImplemented();
    }

    function afterAddLiquidity(address, PoolKey calldata, IPoolManager.ModifyLiquidityParams calldata, BalanceDelta, BalanceDelta, bytes calldata) 
        external pure returns (bytes4, BalanceDelta) {
        revert HookNotImplemented();
    }

    function beforeRemoveLiquidity(address, PoolKey calldata, IPoolManager.ModifyLiquidityParams calldata, bytes calldata) 
        external pure returns (bytes4) {
        revert HookNotImplemented();
    }

    function afterRemoveLiquidity(address, PoolKey calldata, IPoolManager.ModifyLiquidityParams calldata, BalanceDelta, BalanceDelta, bytes calldata) 
        external pure returns (bytes4, BalanceDelta) {
        revert HookNotImplemented();
    }

    function beforeDonate(address, PoolKey calldata, uint256, uint256, bytes calldata) 
        external pure returns (bytes4) {
        revert HookNotImplemented();
    }

    function afterDonate(address, PoolKey calldata, uint256, uint256, bytes calldata) 
        external pure returns (bytes4) {
        revert HookNotImplemented();
    }

    // ============ Internal Functions ============
    
    /// @notice Calculate fee adjustment based on trade size
    function _calculateSizeAdjustment(int256 amountSpecified) internal pure returns (uint24) {
        uint256 absAmount = amountSpecified >= 0 
            ? uint256(amountSpecified) 
            : uint256(-amountSpecified);
        
        // Tiered fee adjustment based on trade size (in wei)
        if (absAmount > 100 ether) {
            return 2000; // +0.2% for very large trades
        } else if (absAmount > 10 ether) {
            return 1000; // +0.1% for large trades
        } else if (absAmount > 1 ether) {
            return 500;  // +0.05% for medium trades
        }
        
        return 0; // No adjustment for small trades
    }
    
    // ============ View Functions ============
    
    /// @notice Get the current fee estimate for a trader
    function estimateFee(
        PoolKey calldata key,
        address trader,
        int256 amountSpecified
    ) external view returns (uint24) {
        PoolId poolId = key.toId();
        
        bool isRegistered = quantumSystem.isRegistered(trader);
        uint24 baseFee = isRegistered ? FEE_REGISTERED : FEE_STANDARD;
        uint24 volatilityAdjustment = uint24((volatilityLevel[poolId] * 70));
        uint24 sizeAdjustment = _calculateSizeAdjustment(amountSpecified);
        
        uint24 dynamicFee = baseFee + volatilityAdjustment + sizeAdjustment;
        
        if (dynamicFee < FEE_MIN) return FEE_MIN;
        if (dynamicFee > FEE_MAX) return FEE_MAX;
        
        return dynamicFee;
    }
    
    /// @notice Check if an address is quantum-registered
    function isQuantumRegistered(address account) external view returns (bool) {
        return quantumSystem.isRegistered(account);
    }
    
    /// @notice Get current volatility level for a pool
    function getVolatility(PoolKey calldata key) external view returns (uint256) {
        return volatilityLevel[key.toId()];
    }
}
