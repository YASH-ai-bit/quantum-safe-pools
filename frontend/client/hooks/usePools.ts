import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, RPC_URLS, CHAIN_ID } from '@/shared/contracts';
import { useSnap } from './useSnap';

// Uniswap V4 Types
interface PoolKey {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

interface Pool {
  id: string;
  poolKey: PoolKey;
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint;
  feeGrowthGlobal0X128: bigint;
  feeGrowthGlobal1X128: bigint;
  tvl: string;
  volume24h: string;
  fees24h: string;
  apy: string;
}

// PoolManager ABI (simplified)
const POOL_MANAGER_ABI = [
  'function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee, uint24 hookFee)',
  'function getLiquidity(bytes32 poolId) external view returns (uint128 liquidity)',
  'function getFeeGrowthGlobal(bytes32 poolId) external view returns (uint256 feeGrowthGlobal0X128, uint256 feeGrowthGlobal1X128)',
  'function initialize(PoolKey calldata key, uint160 sqrtPriceX96, bytes calldata hookData) external returns (int24 tick)',
  'function modifyLiquidity(PoolKey calldata key, ModifyLiquidityParams calldata params, bytes calldata hookData) external returns (BalanceDelta delta, bytes32[] memory)',
  'function swap(PoolKey calldata key, SwapParams calldata params, bytes calldata hookData) external returns (BalanceDelta delta, bytes32[] memory)',
  'event PoolInitialized(bytes32 indexed poolId, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, int24 tick)',
] as const;

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

export function usePools() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isConnected } = useSnap();

  // Fetch all pools from events
  const fetchPools = useCallback(async () => {
    if (!isConnected) {
      setPools([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const flaskProvider = getFlaskProvider();
      if (!flaskProvider) {
        throw new Error('MetaMask Flask not found');
      }

      const provider = new ethers.JsonRpcProvider(RPC_URLS.SEPOLIA);
      const poolManager = new ethers.Contract(
        CONTRACTS.POOL_MANAGER || '0x0000000000000000000000000000000000000000',
        POOL_MANAGER_ABI,
        provider
      );

      // Get PoolInitialized events
      const filter = poolManager.filters.PoolInitialized();
      const events = await provider.getLogs({
        fromBlock: 0,
        toBlock: 'latest',
        address: CONTRACTS.POOL_MANAGER,
        topics: filter.topics,
      });

      const poolsData: Pool[] = [];

      for (const event of events) {
        try {
          const parsed = poolManager.interface.parseLog(event);
          if (parsed) {
            const poolId = parsed.args.poolId;
            const slot0 = await poolManager.getSlot0(poolId);
            const liquidity = await poolManager.getLiquidity(poolId);
            const feeGrowth = await poolManager.getFeeGrowthGlobal(poolId);

            // Calculate metrics (simplified - would need more data for accurate metrics)
            const tvl = '0'; // Would calculate from reserves
            const volume24h = '0'; // Would track from swap events
            const fees24h = '0'; // Would calculate from fee growth
            const apy = '0'; // Would calculate from fees and TVL

            poolsData.push({
              id: poolId,
              poolKey: {
                currency0: parsed.args.currency0,
                currency1: parsed.args.currency1,
                fee: Number(parsed.args.fee),
                tickSpacing: Number(parsed.args.tickSpacing),
                hooks: parsed.args.hooks || CONTRACTS.QUANTUM_HOOK || '0x0000000000000000000000000000000000000000',
              },
              sqrtPriceX96: slot0.sqrtPriceX96,
              tick: Number(slot0.tick),
              liquidity: liquidity,
              feeGrowthGlobal0X128: feeGrowth.feeGrowthGlobal0X128,
              feeGrowthGlobal1X128: feeGrowth.feeGrowthGlobal1X128,
              tvl,
              volume24h,
              fees24h,
              apy,
            });
          }
        } catch (err) {
          console.error('Error parsing pool event:', err);
        }
      }

      setPools(poolsData);
    } catch (err: any) {
      console.error('Error fetching pools:', err);
      setError(err.message || 'Failed to fetch pools');
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  useEffect(() => {
    fetchPools();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPools, 30000);
    return () => clearInterval(interval);
  }, [fetchPools]);

  return {
    pools,
    loading,
    error,
    refetch: fetchPools,
  };
}
