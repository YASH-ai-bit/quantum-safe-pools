import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, RPC_URLS } from '@shared/contracts';
import { useSnap } from './useSnap';

// Helper to get Flask provider
function getFlaskProvider() {
  const { ethereum } = window as any;
  if (!ethereum) return null;

  if (ethereum.providers?.length) {
    const flaskProvider = ethereum.providers.find((p: any) => p.isMetaMask && p.isFlask);
    if (flaskProvider) return flaskProvider;
    return ethereum.providers.find((p: any) => p.isMetaMask);
  }
  return ethereum;
}

// PoolManager ABI for operations
const POOL_MANAGER_ABI = [
  'function initialize(PoolKey calldata key, uint160 sqrtPriceX96, bytes calldata hookData) external returns (int24 tick)',
  'function modifyLiquidity(PoolKey calldata key, ModifyLiquidityParams calldata params, bytes calldata hookData) external returns (BalanceDelta delta, bytes32[] memory)',
  'function swap(PoolKey calldata key, SwapParams calldata params, bytes calldata hookData) external returns (BalanceDelta delta, bytes32[] memory)',
  'function lock(bytes calldata data) external',
] as const;

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

export function usePoolOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isConnected } = useSnap();

  const createPool = useCallback(async (
    currency0: string,
    currency1: string,
    fee: number,
    tickSpacing: number,
    initialPrice: bigint
  ) => {
    if (!isConnected) {
      throw new Error('Please connect MetaMask Flask first');
    }

    setLoading(true);
    setError(null);

    try {
      const flaskProvider = getFlaskProvider();
      if (!flaskProvider) {
        throw new Error('MetaMask Flask not found');
      }

      const provider = new ethers.BrowserProvider(flaskProvider, 'any');
      const signer = await provider.getSigner();
      const poolManager = new ethers.Contract(
        CONTRACTS.POOL_MANAGER || '0x0000000000000000000000000000000000000000',
        POOL_MANAGER_ABI,
        signer
      );

      const poolKey: PoolKey = {
        currency0,
        currency1,
        fee,
        tickSpacing,
        hooks: CONTRACTS.QUANTUM_HOOK || '0x0000000000000000000000000000000000000000',
      };

      // Encode the pool key and initialize
      const tx = await poolManager.initialize(poolKey, initialPrice, '0x');
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create pool';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  const addLiquidity = useCallback(async (
    poolKey: PoolKey,
    tickLower: number,
    tickUpper: number,
    liquidityDelta: bigint
  ) => {
    if (!isConnected) {
      throw new Error('Please connect MetaMask Flask first');
    }

    setLoading(true);
    setError(null);

    try {
      const flaskProvider = getFlaskProvider();
      if (!flaskProvider) {
        throw new Error('MetaMask Flask not found');
      }

      const provider = new ethers.BrowserProvider(flaskProvider, 'any');
      const signer = await provider.getSigner();
      const poolManager = new ethers.Contract(
        CONTRACTS.POOL_MANAGER || '0x0000000000000000000000000000000000000000',
        POOL_MANAGER_ABI,
        signer
      );

      const params: ModifyLiquidityParams = {
        tickLower,
        tickUpper,
        liquidityDelta,
        salt: 0n,
      };

      // Encode the operation in lock
      const lockData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['tuple(address,address,uint24,int24,address)', 'tuple(int24,int24,int256,uint256)'],
        [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks], [params.tickLower, params.tickUpper, params.liquidityDelta, params.salt]]
      );

      const tx = await poolManager.lock(lockData);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to add liquidity';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

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
    if (!isConnected) {
      throw new Error('Please connect MetaMask Flask first');
    }

    setLoading(true);
    setError(null);

    try {
      const flaskProvider = getFlaskProvider();
      if (!flaskProvider) {
        throw new Error('MetaMask Flask not found');
      }

      const provider = new ethers.BrowserProvider(flaskProvider, 'any');
      const signer = await provider.getSigner();
      const poolManager = new ethers.Contract(
        CONTRACTS.POOL_MANAGER || '0x0000000000000000000000000000000000000000',
        POOL_MANAGER_ABI,
        signer
      );

      const params: SwapParams = {
        zeroForOne,
        amountSpecified,
        sqrtPriceLimitX96,
      };

      // Encode swap operation in lock
      const lockData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['tuple(address,address,uint24,int24,address)', 'tuple(bool,int256,uint160)'],
        [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks], [params.zeroForOne, params.amountSpecified, params.sqrtPriceLimitX96]]
      );

      const tx = await poolManager.lock(lockData);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to swap';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  return {
    createPool,
    addLiquidity,
    removeLiquidity,
    swap,
    loading,
    error,
  };
}
