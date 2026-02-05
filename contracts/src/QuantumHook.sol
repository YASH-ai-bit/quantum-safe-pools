// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;

import {BaseHook} from "./BaseHook.sol";
import {TWAMM} from "./TWAMM.sol";
import {QuantumRegistry} from "./QuantumRegistry.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";

/**
 * @title QuantumHook
 * @notice The Grand Unified Hook for Quantum Safe Pools
 * @dev Integrates Identity Gating, TWAMM Trading, and Dynamic Fees
 */
contract QuantumHook is TWAMM {
    QuantumRegistry public immutable registry;
    address public router;

    bool public requireQuantumForPoolCreation = true;

    // Fees (pips, 1/10000)
    uint24 public constant FEE_MEMBER_TIER = 1500; // 0.15%
    uint24 public constant FEE_GUEST_TIER = 4000; // 0.40%

    constructor(
        IPoolManager _manager,
        QuantumRegistry _registry,
        uint256 _expirationInterval
    ) TWAMM(_manager, _expirationInterval) {
        registry = _registry;
    }

    function setRouter(address _router) external {
        // Simple access control: only allow setting once (or by owner if we had one)
        // For Hackathon: Allow setting if unset
        require(router == address(0), "Router already set");
        router = _router;
    }

    modifier onlyQuantum(address user) {
        if (user != router && !registry.isQuantumSafe(user)) {
            revert("QuantumHook: User not Quantum Safe");
        }
        _;
    }

    // ------------------------------------------------
    // Hook Overrides
    // ------------------------------------------------

    PoolId[] public registeredPools;
    mapping(PoolId => PoolKey) public poolKeys;

    function getRegisteredPools() external view returns (PoolId[] memory) {
        return registeredPools;
    }
    
    function getPoolKey(PoolId poolId) external view returns (PoolKey memory) {
        return poolKeys[poolId];
    }
    
    function beforeInitialize(
        address sender,
        PoolKey calldata key,
        uint160 sqrtPriceX96
    ) external override onlyByManager returns (bytes4) {
        if (requireQuantumForPoolCreation && sender != router && !registry.isQuantumSafe(sender)) {
            revert("QuantumHook: Creator not Quantum Safe");
        }
        
        // Track pool
        PoolId id = key.toId();
        registeredPools.push(id);
        poolKeys[id] = key;

        // Initialize TWAMM
        initialize(twammStates[id]);
        return BaseHook.beforeInitialize.selector;
    }

    function beforeAddLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) external override onlyByManager returns (bytes4) {
        // 1. Identity Gate
        if (sender != router && !registry.isQuantumSafe(sender)) {
            revert("QuantumHook: Liq Provider not Quantum Safe");
        }

        // 2. Execute TWAMM Orders
        executeTWAMMOrders(key);

        return BaseHook.beforeAddLiquidity.selector;
    }

    function beforeRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) external override onlyByManager returns (bytes4) {
        // 1. Identity Gate
        if (sender != router && !registry.isQuantumSafe(sender)) {
            revert("QuantumHook: Liq Remover not Quantum Safe");
        }

        return BaseHook.beforeRemoveLiquidity.selector;
    }

    function beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata hookData
    ) external override onlyByManager returns (bytes4, BeforeSwapDelta, uint24) {
        // 1. Execute TWAMM Logic
        executeTWAMMOrders(key);

        // 2. Dynamic Fee Logic
        // Determine fee based on identity
        uint24 overrideFee;
        if (registry.isQuantumSafe(sender) || sender == router) {
            overrideFee = FEE_MEMBER_TIER; // 0.15% (Green)
        } else {
            overrideFee = FEE_GUEST_TIER; // 0.40% (Red/Legacy)
        }

        // bit 23 must be set for overrideFee to work in V4?
        // Actually, overriding fee requires the Hook to return the fee.
        // And the pool key needs to have the dynamic fee flag set (0x800000).
        // `overrideFee` should be the top 24 bits.
        // We set the overrideFee (2nd return value is delta, 3rd is fee).

        // For dynamic fee, we return the uint24 fee.
        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, overrideFee);
    }
}
