import { useState, useEffect, useCallback } from "react";
import { useReadContract, usePublicClient } from "wagmi";
import { CONTRACTS } from "@shared/contracts";
import { formatUnits } from "viem";
import { sepolia } from "wagmi/chains";

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
  token0Symbol: string;
  token1Symbol: string;
}

// PoolManager ABI
const POOL_MANAGER_ABI = [
  {
    name: "PoolInitialized",
    type: "event",
    inputs: [
      { name: "poolId", type: "bytes32", indexed: true },
      { name: "currency0", type: "address", indexed: true },
      { name: "currency1", type: "address", indexed: true },
      { name: "fee", type: "uint24", indexed: false },
      { name: "tickSpacing", type: "int24", indexed: false },
      { name: "tick", type: "int24", indexed: false },
    ],
  },
  {
    name: "getSlot0",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "protocolFee", type: "uint24" },
      { name: "lpFee", type: "uint24" },
      { name: "hookFee", type: "uint24" },
    ],
  },
  {
    name: "getLiquidity",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [{ name: "liquidity", type: "uint128" }],
  },
  {
    name: "getFeeGrowthGlobal",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [
      { name: "feeGrowthGlobal0X128", type: "uint256" },
      { name: "feeGrowthGlobal1X128", type: "uint256" },
    ],
  },
] as const;

// ERC20 ABI for token symbols
const ERC20_ABI = [
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

// QuantumHook ABI for registry functions
const QUANTUM_HOOK_ABI = [
  {
    name: "getRegisteredPools",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  {
    name: "getPoolKey",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
    ],
  },
] as const;

export function usePools() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publicClient = usePublicClient({ chainId: sepolia.id });

  // Fetch pool IDs from on-chain registry (instant, no log scanning!)
  const { data: poolIds, isLoading: isLoadingPools } = useReadContract({
    address: CONTRACTS.QUANTUM_HOOK as `0x${string}`,
    abi: QUANTUM_HOOK_ABI,
    functionName: "getRegisteredPools",
    chainId: sepolia.id,
  });

  // Fetch token symbol
  const fetchTokenSymbol = useCallback(
    async (address: string): Promise<string> => {
      if (
        !address ||
        address === "0x0000000000000000000000000000000000000000"
      ) {
        return "ETH";
      }

      if (!publicClient) return address.slice(0, 6);

      try {
        const symbol = (await publicClient.readContract({
          address: address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "symbol",
        } as any)) as string;
        return symbol || address.slice(0, 6);
      } catch {
        return address.slice(0, 6);
      }
    },
    [publicClient],
  );

  // Fetch pool details for each pool ID from registry
  const fetchPools = useCallback(async () => {
    if (!publicClient || !poolIds || poolIds.length === 0) {
      setPools([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const poolsData: Pool[] = [];

      // Process each pool ID from the on-chain registry
      for (const poolId of poolIds) {
        try {
          // Fetch pool key from hook (this is what we store on-chain)
          const poolKeyResult = (await publicClient.readContract({
            address: CONTRACTS.QUANTUM_HOOK as `0x${string}`,
            abi: QUANTUM_HOOK_ABI,
            functionName: "getPoolKey",
            args: [poolId as `0x${string}`],
          } as any)) as any;

          // Extract pool key from result tuple
          const poolKey: PoolKey = {
            currency0: poolKeyResult.currency0 || poolKeyResult[0],
            currency1: poolKeyResult.currency1 || poolKeyResult[1],
            fee: Number(poolKeyResult.fee ?? poolKeyResult[2]),
            tickSpacing: Number(poolKeyResult.tickSpacing ?? poolKeyResult[3]),
            hooks: poolKeyResult.hooks || poolKeyResult[4],
          };

          // Fetch token symbols
          const [token0Symbol, token1Symbol] = await Promise.all([
            fetchTokenSymbol(poolKey.currency0),
            fetchTokenSymbol(poolKey.currency1),
          ]);

          // For V4 pools, we display basic info without querying PoolManager directly
          // (PoolManager uses extsload pattern which requires custom handling)
          poolsData.push({
            id: poolId as `0x${string}`,
            poolKey: {
              currency0: poolKey.currency0,
              currency1: poolKey.currency1,
              fee: poolKey.fee,
              tickSpacing: poolKey.tickSpacing,
              hooks: poolKey.hooks,
            },
            sqrtPriceX96: BigInt("79228162514264337593543950336"), // 1:1 default
            tick: 0,
            liquidity: 0n,
            feeGrowthGlobal0X128: 0n,
            feeGrowthGlobal1X128: 0n,
            tvl: "0.00",
            volume24h: "0.00",
            fees24h: "0.00",
            apy: "0.00",
            token0Symbol,
            token1Symbol,
          });
        } catch (err) {
          console.error("Error fetching pool details for", poolId, ":", err);
          // Continue with other pools even if one fails
        }
      }

      setPools(poolsData);
    } catch (err: any) {
      console.error("Error fetching pools:", err);
      setError(err.message || "Failed to fetch pools");
    } finally {
      setLoading(false);
    }
  }, [publicClient, poolIds, fetchTokenSymbol]);

  // Fetch pools when pool IDs are loaded
  useEffect(() => {
    if (poolIds !== undefined) {
      fetchPools();
    }
  }, [poolIds, fetchPools]);

  // Combine loading states
  const isLoading = isLoadingPools || loading;

  return {
    pools,
    loading: isLoading,
    error,
    refetch: fetchPools,
  };
}
