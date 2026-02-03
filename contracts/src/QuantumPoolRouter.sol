// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";
import {BalanceDelta} from "@uniswap/v4-core/types/BalanceDelta.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/types/Currency.sol";
import {IUnlockCallback} from "@uniswap/v4-core/interfaces/callback/IUnlockCallback.sol";
import {IERC20Minimal} from "@uniswap/v4-core/interfaces/external/IERC20Minimal.sol";

/**
 * @title QuantumPoolRouter
 * @dev Router contract for interacting with Uniswap V4 pools via QuantumHook
 * @notice Handles swaps and liquidity operations with proper currency settlement
 */
contract QuantumPoolRouter is IUnlockCallback {
    using CurrencyLibrary for Currency;
    
    IPoolManager public immutable manager;

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

    constructor(IPoolManager _manager) {
        manager = _manager;
    }

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
                if (delta.amount0() < 0) {
                    // Paying token0
                    manager.sync(swapData.key.currency0);
                    if (swapData.key.currency0.isAddressZero()) {
                        manager.settle{value: uint256(int256(-delta.amount0()))}();
                    } else {
                        IERC20Minimal(Currency.unwrap(swapData.key.currency0)).transferFrom(
                            swapData.sender, address(manager), uint256(int256(-delta.amount0()))
                        );
                        manager.settle();
                    }
                }
                if (delta.amount1() > 0) {
                    // Receiving token1
                    manager.take(swapData.key.currency1, swapData.sender, uint256(int256(delta.amount1())));
                }
            } else {
                // Swapping token1 for token0
                if (delta.amount1() < 0) {
                    // Paying token1
                    manager.sync(swapData.key.currency1);
                    if (swapData.key.currency1.isAddressZero()) {
                        manager.settle{value: uint256(int256(-delta.amount1()))}();
                    } else {
                        IERC20Minimal(Currency.unwrap(swapData.key.currency1)).transferFrom(
                            swapData.sender, address(manager), uint256(int256(-delta.amount1()))
                        );
                        manager.settle();
                    }
                }
                if (delta.amount0() > 0) {
                    // Receiving token0
                    manager.take(swapData.key.currency0, swapData.sender, uint256(int256(delta.amount0())));
                }
            }
        } else {
            // Liquidity operation
            LiquidityCallbackData memory liqData = abi.decode(data, (LiquidityCallbackData));
            
            (BalanceDelta delta, ) = manager.modifyLiquidity(liqData.key, liqData.params, new bytes(0));

            // Settle currencies based on delta
            if (delta.amount0() < 0) {
                // Paying token0
                manager.sync(liqData.key.currency0);
                if (liqData.key.currency0.isAddressZero()) {
                    manager.settle{value: uint256(int256(-delta.amount0()))}();
                } else {
                    IERC20Minimal(Currency.unwrap(liqData.key.currency0)).transferFrom(
                        liqData.sender, address(manager), uint256(int256(-delta.amount0()))
                    );
                    manager.settle();
                }
            } else if (delta.amount0() > 0) {
                // Receiving token0
                manager.take(liqData.key.currency0, liqData.sender, uint256(int256(delta.amount0())));
            }

            if (delta.amount1() < 0) {
                // Paying token1
                manager.sync(liqData.key.currency1);
                if (liqData.key.currency1.isAddressZero()) {
                    manager.settle{value: uint256(int256(-delta.amount1()))}();
                } else {
                    IERC20Minimal(Currency.unwrap(liqData.key.currency1)).transferFrom(
                        liqData.sender, address(manager), uint256(int256(-delta.amount1()))
                    );
                    manager.settle();
                }
            } else if (delta.amount1() > 0) {
                // Receiving token1
                manager.take(liqData.key.currency1, liqData.sender, uint256(int256(delta.amount1())));
            }
        }

        return "";
    }
}
