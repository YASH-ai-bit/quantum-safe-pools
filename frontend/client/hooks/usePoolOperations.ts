import { useState, useCallback } from 'react';
import { useSnap } from './useSnap';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { CONTRACTS } from '@shared/contracts';
import { encodeFunctionData } from 'viem';
import { sepolia } from 'wagmi/chains';

interface PoolKey {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

interface ModifyLiquidityParams {
  tickLower: number;
  tickUpper: number;
  liquidityDelta: bigint;
  salt: bigint;
}

interface SwapParams {
  zeroForOne: boolean;
  amountSpecified: bigint;
  sqrtPriceLimitX96: bigint;
}

// PoolManager ABI for operations
const POOL_MANAGER_ABI = [
  {
    name: 'initialize',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
      },
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [{ name: 'tick', type: 'int24' }],
  },
  {
    name: 'modifyLiquidity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
      },
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tickLower', type: 'int24' },
          { name: 'tickUpper', type: 'int24' },
          { name: 'liquidityDelta', type: 'int256' },
          { name: 'salt', type: 'uint256' },
        ],
      },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [
      {
        name: 'delta',
        type: 'tuple',
        components: [
          { name: 'amount0', type: 'int256' },
          { name: 'amount1', type: 'int256' },
        ],
      },
      { name: '', type: 'bytes32[]' },
    ],
  },
  {
    name: 'swap',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
      },
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'zeroForOne', type: 'bool' },
          { name: 'amountSpecified', type: 'int256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [
      {
        name: 'delta',
        type: 'tuple',
        components: [
          { name: 'amount0', type: 'int256' },
          { name: 'amount1', type: 'int256' },
        ],
      },
      { name: '', type: 'bytes32[]' },
    ],
  },
  {
    name: 'lock',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'data', type: 'bytes' }],
    outputs: [],
  },
] as const;

export function usePoolOperations() {
  const [error, setError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId: sepolia.id,
  });

  const loading = isPending || isConfirming;

  // Hook for Snap
  const { isConnected: isSnapConnected, sendTransaction: sendSnapTransaction } = useSnap();

  const createPool = useCallback(async (
    currency0: string,
    currency1: string,
    fee: number,
    tickSpacing: number,
    initialPrice: bigint
  ) => {
    if (!isConnected || !address) {
      throw new Error('Please connect MetaMask Flask first');
    }

    setError(null);

    const args = [
      {
        currency0: currency0 as `0x${string}`,
        currency1: currency1 as `0x${string}`,
        fee: fee,
        tickSpacing: tickSpacing,
        hooks: CONTRACTS.QUANTUM_HOOK || '0x0000000000000000000000000000000000000000',
      },
      initialPrice,
      '0x' as `0x${string}`,
    ];

    try {
      if (isSnapConnected) {
        // Use Snap (Yellow Nitrolite optimized)
        const data = encodeFunctionData({
          abi: POOL_MANAGER_ABI,
          functionName: 'initialize',
          args: args as any
        });

        console.log('%c[POOL] Creating pool with quantum-safe transaction...', 'color: #00ffff; font-weight: bold;');

        const result = await sendSnapTransaction(
          CONTRACTS.POOL_MANAGER,
          '0', // value
          data
        );

        // Check if snap returned an error
        if (result.error) {
          console.error('%c[POOL] ❌ Snap returned error:', 'color: #ff0000; font-weight: bold;', result.error);
          if (result.logs && Array.isArray(result.logs)) {
            console.log('%c[POOL] Snap logs:', 'color: #ffff00;', result.logs);
          }
          throw new Error(`Pool creation failed: ${result.error}`);
        }

        if (!result.transactionHash) {
          console.error('%c[POOL] ⚠️ No transaction hash:', 'color: #ff9900;', result);
          throw new Error('Pool creation failed - no transaction hash received');
        }

        console.log('%c[POOL] ✅ Pool created successfully!', 'color: #00ff00; font-weight: bold;');
        console.log('%c[POOL] Transaction hash:', 'color: #00ff00;', result.transactionHash);

        // Return the transaction hash from the bundler receipt
        return {
          hash: result.transactionHash as `0x${string}`,
          userOpHash: result.userOpHash,
        };
      }

      // Fallback to standard wagmi (likely to fail if Quantum Hook enforces it)
      writeContract({
        address: CONTRACTS.POOL_MANAGER as `0x${string}`,
        abi: POOL_MANAGER_ABI,
        functionName: 'initialize',
        args: args as any,
        chainId: sepolia.id,
      } as any);

      return { hash };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create pool';
      console.error('%c[POOL] ❌ Pool creation failed:', 'color: #ff0000; font-weight: bold;', errorMsg);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [isConnected, address, writeContract, hash, isSnapConnected, sendSnapTransaction]);

  const addLiquidity = useCallback(async (
    poolKey: PoolKey,
    tickLower: number,
    tickUpper: number,
    liquidityDelta: bigint
  ) => {
    if (!isConnected || !address) {
      throw new Error('Please connect MetaMask Flask first');
    }

    setError(null);

    try {
      const params: ModifyLiquidityParams = {
        tickLower,
        tickUpper,
        liquidityDelta,
        salt: 0n,
      };

      writeContract({
        address: CONTRACTS.POOL_MANAGER as `0x${string}`,
        abi: POOL_MANAGER_ABI,
        functionName: 'modifyLiquidity',
        args: [
          {
            currency0: poolKey.currency0 as `0x${string}`,
            currency1: poolKey.currency1 as `0x${string}`,
            fee: poolKey.fee,
            tickSpacing: poolKey.tickSpacing,
            hooks: poolKey.hooks as `0x${string}`,
          },
          {
            tickLower: params.tickLower,
            tickUpper: params.tickUpper,
            liquidityDelta: params.liquidityDelta,
            salt: params.salt,
          },
          '0x' as `0x${string}`,
        ],
        chainId: sepolia.id,
      } as any);

      return { hash };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to add liquidity';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [isConnected, address, writeContract, hash]);

  const removeLiquidity = useCallback(async (
    poolKey: PoolKey,
    tickLower: number,
    tickUpper: number,
    liquidityDelta: bigint
  ) => {
    // Same as addLiquidity but with negative liquidityDelta
    return addLiquidity(poolKey, tickLower, tickUpper, -liquidityDelta);
  }, [addLiquidity]);

  const swap = useCallback(async (
    poolKey: PoolKey,
    zeroForOne: boolean,
    amountSpecified: bigint,
    sqrtPriceLimitX96: bigint
  ) => {
    if (!isConnected || !address) {
      throw new Error('Please connect MetaMask Flask first');
    }

    setError(null);

    try {
      const params: SwapParams = {
        zeroForOne,
        amountSpecified,
        sqrtPriceLimitX96,
      };

      writeContract({
        address: CONTRACTS.POOL_MANAGER as `0x${string}`,
        abi: POOL_MANAGER_ABI,
        functionName: 'swap',
        args: [
          {
            currency0: poolKey.currency0 as `0x${string}`,
            currency1: poolKey.currency1 as `0x${string}`,
            fee: poolKey.fee,
            tickSpacing: poolKey.tickSpacing,
            hooks: poolKey.hooks as `0x${string}`,
          },
          {
            zeroForOne: params.zeroForOne,
            amountSpecified: params.amountSpecified,
            sqrtPriceLimitX96: params.sqrtPriceLimitX96,
          },
          '0x' as `0x${string}`,
        ],
        chainId: sepolia.id,
      } as any);

      return { hash };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to swap';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [isConnected, address, writeContract, hash]);

  return {
    createPool,
    addLiquidity,
    removeLiquidity,
    swap,
    loading,
    error,
    hash,
    isSuccess,
  };
}
