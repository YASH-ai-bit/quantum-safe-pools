// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {CurrencySettler} from "@uniswap/v4-core/test/utils/CurrencySettler.sol";
import {IERC20Minimal} from "@uniswap/v4-core/src/interfaces/external/IERC20Minimal.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";

// Contract for reliable atomic execution
contract QuantumLiquidityEngine {
    using CurrencySettler for Currency;
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    IPoolManager public immutable manager;
    
    // --- IDEMPOTENCY ---
    mapping(bytes32 => bool) public executedBatches;

    // --- CONTEXT PRESERVATION ---
    // Tracks the original sender during a batch execution (transient-ish storage)
    address private _batchSender;

    string public constant VERSION = "v2.0.0-refactor";

    event BatchExecuted(bytes32 indexed batchId, address indexed sender);
    event PoolInitialized(bytes32 indexed poolId, int24 tick);
    event RouterModifyLiquidity(address indexed sender, bytes32 indexed poolId, int256 liquidityDelta, BalanceDelta delta);
    event RouterSwap(address indexed sender, bytes32 indexed poolId, IPoolManager.SwapParams params, BalanceDelta delta);
    event RouterSettlement(address indexed sender, Currency currency0, Currency currency1, int128 delta0, int128 delta1);

    constructor(IPoolManager _manager) {
        manager = _manager;
    }

    function _getSender() internal view returns (address) {
        if (_batchSender != address(0)) {
            return _batchSender;
        }
        return msg.sender;
    }

    // --- ATOMIC BATCH EXECUTION ---

    function executeBatch(bytes32 batchId, bytes[] calldata calls) external {
        require(batchId != bytes32(0), "Invalid batchId");
        require(!executedBatches[batchId], "BATCH_ALREADY_EXECUTED");
        
        executedBatches[batchId] = true;
        emit BatchExecuted(batchId, msg.sender);

        // Set context for subcalls
        _batchSender = msg.sender;

        for (uint256 i = 0; i < calls.length; i++) {
            // Use internal CALL to preserve safety (no delegatecall storage risks)
            // msg.sender in subcall will be address(this), so we use _getSender() to recover original user
            (bool success, bytes memory result) = address(this).call(calls[i]);
            
            if (!success) {
                // Clear context before reverting
                _batchSender = address(0);
                
                // Determine revert reason
                if (result.length > 0) {
                     assembly {
                        let returndata_size := mload(result)
                        revert(add(32, result), returndata_size)
                    }
                } else {
                    revert("SUBCALL_FAILED");
                }
            }
        }

        // Clear context
        _batchSender = address(0);
    }

    // --- POOL OPERATIONS ---

    /// @notice Initialize a new pool SAFELY - idempotent
    function initializePoolSafe(
        PoolKey memory key,
        uint160 sqrtPriceX96
    ) external payable returns (int24 tick) {
        require(sqrtPriceX96 != 0, "INVALID_PRICE");
        PoolId poolId = key.toId();
        
        // Native V4 check: getSlot0 returns 0 if not initialized (usually)
        (uint160 existingPrice,,,) = manager.getSlot0(poolId);
        
        if (existingPrice != 0) {
            // Already initialized, return current tick and exit gracefully
            (, tick,,) = manager.getSlot0(poolId);
            return tick;
        }

        tick = manager.initialize(key, sqrtPriceX96);
        emit PoolInitialized(PoolId.unwrap(poolId), tick);
    }
    
    // Standard Initialize (legacy support)
    function initialize(
        PoolKey memory key,
        uint160 sqrtPriceX96
    ) external payable returns (int24 tick) {
        tick = manager.initialize(key, sqrtPriceX96);
        emit PoolInitialized(PoolId.unwrap(key.toId()), tick);
    }

    function swap(
        PoolKey memory key,
        IPoolManager.SwapParams memory params,
        bytes calldata hookData
    ) external payable returns (BalanceDelta delta) {
        address sender = _getSender();
        bytes memory data = abi.encode(uint8(0), sender, key, params, hookData);
        bytes memory retd = manager.unlock(data);
        delta = abi.decode(retd, (BalanceDelta));
        emit RouterSwap(sender, PoolId.unwrap(key.toId()), params, delta);
    }

    function modifyLiquidity(
        PoolKey memory key,
        IPoolManager.ModifyLiquidityParams memory params,
        bytes calldata hookData
    ) external payable returns (BalanceDelta delta) {
        address sender = _getSender();
        
        // Enforce Token Flow: Pull from User -> Engine -> Manager
        bytes memory data = abi.encode(uint8(1), sender, key, params, hookData);
        bytes memory retd = manager.unlock(data);
        delta = abi.decode(retd, (BalanceDelta));
        emit RouterModifyLiquidity(sender, PoolId.unwrap(key.toId()), params.liquidityDelta, delta);
    }
    
    // --- CALLBACK HANDLER ---

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(manager), "Only manager");
        
        uint8 tag = abi.decode(data, (uint8));
        
        if (tag == 0) {
            // Swap
            (, address sender, PoolKey memory key, IPoolManager.SwapParams memory params, bytes memory hookData) = 
                abi.decode(data, (uint8, address, PoolKey, IPoolManager.SwapParams, bytes));
            
            BalanceDelta delta = manager.swap(key, params, hookData);
            _settle(sender, key.currency0, key.currency1, delta.amount0(), delta.amount1());
            return abi.encode(delta);
        } else {
            // Modify Liquidity
            (, address sender, PoolKey memory key, IPoolManager.ModifyLiquidityParams memory params, bytes memory hookData) = 
                abi.decode(data, (uint8, address, PoolKey, IPoolManager.ModifyLiquidityParams, bytes));
            
            (BalanceDelta delta, ) = manager.modifyLiquidity(key, params, hookData);
            _settle(sender, key.currency0, key.currency1, delta.amount0(), delta.amount1());
            return abi.encode(delta);
        }
    }

    // --- PROPER SETTLEMENT ---

    function _settle(address sender, Currency currency0, Currency currency1, int128 delta0, int128 delta1) internal {
        emit RouterSettlement(sender, currency0, currency1, delta0, delta1);
        
        // Settlement for Currency 0
        if (delta0 > 0) {
            uint256 amount = uint256(int256(delta0));
            if (Currency.unwrap(currency0) == address(0)) {
                manager.settle{value: amount}();
            } else {
                // Pull from User to Engine (User must have approved Engine)
                IERC20Minimal(Currency.unwrap(currency0)).transferFrom(sender, address(this), amount);
                // Engine pays Manager
                IERC20Minimal(Currency.unwrap(currency0)).approve(address(manager), amount);
                manager.sync(currency0); 
                manager.settle();
            }
        } else if (delta0 < 0) {
            // Manager pays User (via Engine take)
            uint256 amount = uint256(int256(-delta0));
            manager.take(currency0, sender, amount);
        }

        // Settlement for Currency 1
        if (delta1 > 0) {
            uint256 amount = uint256(int256(delta1));
            if (Currency.unwrap(currency1) == address(0)) {
                manager.settle{value: amount}();
            } else {
                // Pull from User to Engine
                IERC20Minimal(Currency.unwrap(currency1)).transferFrom(sender, address(this), amount);
                // Engine pays Manager
                IERC20Minimal(Currency.unwrap(currency1)).approve(address(manager), amount);
                manager.sync(currency1);
                manager.settle();
            }
        } else if (delta1 < 0) {
            uint256 amount = uint256(int256(-delta1));
            manager.take(currency1, sender, amount);
        }
    }
    
    // Allow receiving ETH
    receive() external payable {}
}
