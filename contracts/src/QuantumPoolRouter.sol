// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolTestBase} from "@uniswap/v4-core/src/test/PoolTestBase.sol";
import {CurrencySettler} from "@uniswap/v4-core/test/utils/CurrencySettler.sol";

/**
 * @title QuantumPoolRouter
 * @dev Router contract for interacting with Uniswap V4 pools via QuantumHook
 * @notice Handles swaps and liquidity operations with proper currency settlement
 */
contract QuantumPoolRouter is PoolTestBase {
    using CurrencyLibrary for Currency;
    using CurrencySettler for Currency;

    error InvalidCaller();

    struct SwapCallbackData {
        address sender;
        PoolKey key;
        IPoolManager.SwapParams params;
    }

    struct LiquidityCallbackData {
        address sender;
        PoolKey key;
        IPoolManager.ModifyLiquidityParams params;
    }

    enum OperationType {
        SWAP,
        MODIFY_LIQUIDITY
    }

    constructor(IPoolManager _manager) PoolTestBase(_manager) {}

    /**
     * @dev Execute a swap through the pool
     * @param key The pool key
     * @param params Swap parameters
     */
    function swap(PoolKey memory key, IPoolManager.SwapParams memory params) external payable {
        manager.unlock(abi.encode(OperationType.SWAP, SwapCallbackData(msg.sender, key, params)));
    }

    /**
     * @dev Add liquidity to a pool
     * @param key The pool key
     * @param params Liquidity modification parameters
     */
    function addLiquidity(
        PoolKey memory key,
        IPoolManager.ModifyLiquidityParams memory params
    ) external payable {
        manager.unlock(abi.encode(OperationType.MODIFY_LIQUIDITY, LiquidityCallbackData(msg.sender, key, params)));
    }

    /**
     * @dev Remove liquidity from a pool
     * @param key The pool key
     * @param params Liquidity modification parameters (with negative liquidityDelta)
     */
    function removeLiquidity(
        PoolKey memory key,
        IPoolManager.ModifyLiquidityParams memory params
    ) external payable {
        manager.unlock(abi.encode(OperationType.MODIFY_LIQUIDITY, LiquidityCallbackData(msg.sender, key, params)));
    }

    /**
     * @dev Initialize a new pool
     * @param key The pool key
     * @param sqrtPriceX96 Initial sqrt price
     */
    function initialize(
        PoolKey memory key,
        uint160 sqrtPriceX96
    ) external returns (int24 tick) {
        return manager.initialize(key, sqrtPriceX96);
    }

    /**
     * @dev Callback function called by PoolManager during unlock
     */
    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        require(msg.sender == address(manager), "Invalid caller");

        (OperationType opType, bytes memory data) = abi.decode(rawData, (OperationType, bytes));

        if (opType == OperationType.SWAP) {
            // Swap operation
            SwapCallbackData memory swapData = abi.decode(data, (SwapCallbackData));
            BalanceDelta delta = manager.swap(swapData.key, swapData.params, new bytes(0));

            // Settle currencies
            if (swapData.params.zeroForOne) {
                // Swapping token0 for token1
                swapData.key.currency0.settle(manager, swapData.sender, uint256(int256(-delta.amount0())), false);
                swapData.key.currency1.take(manager, swapData.sender, uint256(int256(delta.amount1())), false);
            } else {
                // Swapping token1 for token0
                swapData.key.currency1.settle(manager, swapData.sender, uint256(int256(-delta.amount1())), false);
                swapData.key.currency0.take(manager, swapData.sender, uint256(int256(delta.amount0())), false);
            }
        } else {
            // Liquidity operation
            LiquidityCallbackData memory liqData = abi.decode(data, (LiquidityCallbackData));
            
            (BalanceDelta delta, ) = manager.modifyLiquidity(liqData.key, liqData.params, new bytes(0));

            // Settle currencies based on delta
            if (delta.amount0() < 0) {
                // Paying token0
                liqData.key.currency0.settle(manager, liqData.sender, uint256(int256(-delta.amount0())), false);
            } else if (delta.amount0() > 0) {
                // Receiving token0
                liqData.key.currency0.take(manager, liqData.sender, uint256(int256(delta.amount0())), false);
            }

            if (delta.amount1() < 0) {
                // Paying token1
                liqData.key.currency1.settle(manager, liqData.sender, uint256(int256(-delta.amount1())), false);
            } else if (delta.amount1() > 0) {
                // Receiving token1
                liqData.key.currency1.take(manager, liqData.sender, uint256(int256(delta.amount1())), false);
            }
        }

        return "";
    }
}
