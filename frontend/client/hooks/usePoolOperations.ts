import { useState, useCallback } from 'react';
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

    try {
      const poolKey: PoolKey = {
        currency0,
        currency1,
        fee,
        tickSpacing,
        hooks: CONTRACTS.QUANTUM_HOOK || '0x0000000000000000000000000000000000000000',
      };

      writeContract({
        address: CONTRACTS.POOL_MANAGER as `0x${string}`,
        abi: POOL_MANAGER_ABI,
        functionName: 'initialize',
        args: [
          {
            currency0: poolKey.currency0 as `0x${string}`,
            currency1: poolKey.currency1 as `0x${string}`,
            fee: poolKey.fee,
            tickSpacing: poolKey.tickSpacing,
            hooks: poolKey.hooks as `0x${string}`,
          },
          initialPrice,
          '0x' as `0x${string}`,
        ],
        chainId: sepolia.id,
      } as any);

      return { hash };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create pool';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [isConnected, address, writeContract, hash]);

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
