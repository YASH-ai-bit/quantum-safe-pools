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
  salt: `0x${string}`;
}

interface SwapParams {
  zeroForOne: boolean;
  amountSpecified: bigint;
  sqrtPriceLimitX96: bigint;
}

// QuantumPoolRouter ABI for operations (calls PoolManager internally)
const QUANTUM_POOL_ROUTER_ABI = [
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
    ],
    outputs: [{ name: 'tick', type: 'int24' }],
  },
  {
    name: 'addLiquidity',
    type: 'function',
    stateMutability: 'payable',
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
          { name: 'salt', type: 'bytes32' },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: 'removeLiquidity',
    type: 'function',
    stateMutability: 'payable',
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
          { name: 'salt', type: 'bytes32' },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: 'swap',
    type: 'function',
    stateMutability: 'payable',
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
    ],
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

  const [snapLoading, setSnapLoading] = useState(false);
  const loading = isPending || isConfirming || snapLoading;

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

    // Uniswap V4 requires currency0 < currency1 (sorted by address)
    const [orderedCurrency0, orderedCurrency1] =
      currency0.toLowerCase() < currency1.toLowerCase()
        ? [currency0, currency1]
        : [currency1, currency0];

    // Use dynamic fee flag for hook-enabled pools (bit 23 set = 0x800000)
    const dynamicFee = 0x800000;

    const poolKey = {
      currency0: orderedCurrency0 as `0x${string}`,
      currency1: orderedCurrency1 as `0x${string}`,
      fee: dynamicFee,
      tickSpacing: tickSpacing,
      hooks: CONTRACTS.QUANTUM_HOOK as `0x${string}`,
    };

    const args = [poolKey, initialPrice];

    try {
      if (isSnapConnected) {
        setSnapLoading(true);
        try {
          // Use Snap (Yellow Nitrolite optimized)
          const data = encodeFunctionData({
            abi: QUANTUM_POOL_ROUTER_ABI,
            functionName: 'initialize',
            args: args as any
          });

          console.log('%c[POOL] Creating pool with quantum-safe transaction...', 'color: #00ffff; font-weight: bold;');
          console.log('%c[POOL] Pool Key:', 'color: #00ffff;', poolKey);
          console.log('%c[POOL] Initial Price (sqrtPriceX96):', 'color: #00ffff;', initialPrice.toString());

          const result = await sendSnapTransaction(
            CONTRACTS.QUANTUM_POOL_ROUTER,
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
        } finally {
          setSnapLoading(false);
        }
      }

      // Fallback to standard wagmi (likely to fail if Quantum Hook enforces it)
      writeContract({
        address: CONTRACTS.QUANTUM_POOL_ROUTER as `0x${string}`,
        abi: QUANTUM_POOL_ROUTER_ABI,
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
        address: CONTRACTS.QUANTUM_POOL_ROUTER as `0x${string}`,
        abi: QUANTUM_POOL_ROUTER_ABI,
        functionName: 'addLiquidity',
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
            salt: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
          },
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
        address: CONTRACTS.QUANTUM_POOL_ROUTER as `0x${string}`,
        abi: QUANTUM_POOL_ROUTER_ABI,
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
