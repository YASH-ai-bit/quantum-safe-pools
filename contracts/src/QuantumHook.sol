// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import {BaseHook} from "./BaseHook.sol";
import {QuantumSystem} from "./QuantumSystem.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title QuantumHook
 * @notice Lightweight Policy Hook for Quantum Safe Pools
 * @dev Enforces Identity Gating and Dynamic Fees. NO state writes.
 */
contract QuantumHook is BaseHook, Ownable {
    QuantumSystem public immutable quantumSystem;
    address public allowedLiquidityEngine;

    // Fees (pips, 1/10000)
    uint24 public constant FEE_MEMBER_TIER = 1500; // 0.15% (Green)
    uint24 public constant FEE_GUEST_TIER = 4000; // 0.40% (Red/Legacy)

    constructor(
        IPoolManager _manager,
        QuantumSystem _system,
        address _owner
    ) BaseHook(_manager) Ownable(_owner) {
        quantumSystem = _system;
    }

    function setLiquidityEngine(address _engine) external onlyOwner {
        // Enforce access control
        allowedLiquidityEngine = _engine;
    }

    // ------------------------------------------------
    // Permissions
    // ------------------------------------------------

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
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

    // ------------------------------------------------
    // Callbacks (Side-Effect Free)
    // ------------------------------------------------

    function beforeInitialize(
        address sender,
        PoolKey calldata,
        uint160
    ) external view override onlyByManager returns (bytes4) {
        // Whitelist the Liquidity Engine (Router)
        if (sender == allowedLiquidityEngine) {
             return BaseHook.beforeInitialize.selector;
        }

        // Otherwise check user identity
        if (!quantumSystem.isQuantumSafe(sender)) {
            revert("QuantumHook: Creator not Quantum Safe");
        }
        
        return BaseHook.beforeInitialize.selector;
    }

    function beforeAddLiquidity(
        address sender,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata
    ) external view override onlyByManager returns (bytes4) {
        if (sender == allowedLiquidityEngine) return BaseHook.beforeAddLiquidity.selector;

        if (!quantumSystem.isQuantumSafe(sender)) {
            revert("QuantumHook: Liq Provider not Quantum Safe");
        }
        return BaseHook.beforeAddLiquidity.selector;
    }

    function beforeRemoveLiquidity(
        address sender,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata
    ) external view override onlyByManager returns (bytes4) {
        if (sender == allowedLiquidityEngine) return BaseHook.beforeRemoveLiquidity.selector;

        if (!quantumSystem.isQuantumSafe(sender)) {
            revert("QuantumHook: Liq Remover not Quantum Safe");
        }
        return BaseHook.beforeRemoveLiquidity.selector;
    }

    function beforeSwap(
        address sender,
        PoolKey calldata,
        IPoolManager.SwapParams calldata,
        bytes calldata
    ) external view override onlyByManager returns (bytes4, BeforeSwapDelta, uint24) {
        // Dynamic Fee Logic based on Identity
        
        // Note: For swaps coming via Router, sender is the Router/Engine.
        // If we want to identify the USER, the Router should pass the user address in hookData?
        // Or we assume Router traffic gets MEMBER tier?
        // For Hackathon: If sender is Engine or QuantumSafe User, get Member Tier.
        
        uint24 fee = FEE_GUEST_TIER;
        
        if (sender == allowedLiquidityEngine) {
            fee = FEE_MEMBER_TIER;
        } else if (quantumSystem.isQuantumSafe(sender)) {
            fee = FEE_MEMBER_TIER;
        }

        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, fee);
    }
}
