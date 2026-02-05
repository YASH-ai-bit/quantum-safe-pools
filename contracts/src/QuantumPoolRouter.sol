// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {CurrencySettler} from "@uniswap/v4-core/test/utils/CurrencySettler.sol";
import {IERC20Minimal} from "@uniswap/v4-core/src/interfaces/external/IERC20Minimal.sol";

contract QuantumPoolRouter {
    using CurrencySettler for Currency;

    IPoolManager public immutable manager;

    constructor(IPoolManager _manager) {
        manager = _manager;
    }

    function swap(
        PoolKey memory key,
        IPoolManager.SwapParams memory params,
        bytes calldata hookData
    ) external payable returns (BalanceDelta delta) {
        bytes memory data = abi.encode(uint8(0), msg.sender, key, params, hookData);
        bytes memory retd = manager.unlock(data);
        delta = abi.decode(retd, (BalanceDelta));
    }

    function modifyLiquidity(
        PoolKey memory key,
        IPoolManager.ModifyLiquidityParams memory params,
        bytes calldata hookData
    ) external payable returns (BalanceDelta delta) {
        bytes memory data = abi.encode(uint8(1), msg.sender, key, params, hookData);
        bytes memory retd = manager.unlock(data);
        delta = abi.decode(retd, (BalanceDelta));
    }
    
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
            
            // Note: modifyLiquidity returns delta in terms of what the pool implies.
            // Positive = user owes (add liq). Negative = pool owes (remove liq)?
            // Actually BalanceDelta definitions:
            // amount0 > 0: Pool takes from user (or user pays pool)
            // amount0 < 0: Pool pays user
            // This matches swap delta exactly.
            
            // For modifyLiquidity specifically (Add Liquidity):
            // We Provide Liquidity -> We Pay Tokens -> Amount is Negative?
            // Wait, standard Uniswap v4 definition:
            // delta > 0: Pool owes to caller.
            // delta < 0: Caller owes to pool.
            
            // Let's use standard CurrencySettler or manual checks.
            // Safe bet: Check Manager's currencyDelta.
            // If manager.currencyDelta(address(this), currency) > 0 (Manager owes us), take.
            // If < 0 (We owe Manager), pay.
            // But checking standard implementation is better.
            
            // Using logic from similar routers:
            // Settle based on logic.
            _settle(sender, key.currency0, key.currency1, delta.amount0(), delta.amount1());
            return abi.encode(delta);
        }
    }

    function _settle(address sender, Currency currency0, Currency currency1, int128 delta0, int128 delta1) internal {
        // Delta > 0: User owes tokens to Pool
        // Delta < 0: Pool owes tokens to User
        
        // Settlement for Currency 0
        if (delta0 > 0) {
            uint256 amount = uint256(int256(delta0));
            // 1. Checkpoint (required before transfer for settle)
            manager.sync(currency0);
            // 2. Transfer tokens from User to Manager
            IERC20Minimal(Currency.unwrap(currency0)).transferFrom(sender, address(manager), amount);
            // 3. Settle the debt
            manager.settle();
        } else if (delta0 < 0) {
            uint256 amount = uint256(int256(-delta0));
            // Manager owes user. Take from Manager to User.
            manager.take(currency0, sender, amount);
        }

        // Settlement for Currency 1
        if (delta1 > 0) {
            uint256 amount = uint256(int256(delta1));
            manager.sync(currency1);
            IERC20Minimal(Currency.unwrap(currency1)).transferFrom(sender, address(manager), amount);
            manager.settle();
        } else if (delta1 < 0) {
            uint256 amount = uint256(int256(-delta1));
            manager.take(currency1, sender, amount);
        }
    }
}
