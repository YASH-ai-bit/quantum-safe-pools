import { useState, useEffect, useCallback } from "react";
import { useReadContract, usePublicClient } from "wagmi";
import { CONTRACTS } from "@shared/contracts";
import { formatUnits, keccak256, encodePacked, pad, toHex, hexToBigInt, slice } from "viem";
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

// POOLS_SLOT in PoolManager is 6 (see PoolManager.sol: mapping(PoolId id => Pool.State) internal _pools)
const POOLS_SLOT = 6n;

// PoolManager ABI with extsload for V4 state reading
const POOL_MANAGER_ABI = [
  {
    name: "extsload",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "slot", type: "bytes32" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
] as const;

// ERC20 ABI for token symbols and decimals
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
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
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

/**
 * Calculate the storage slot for pool state in PoolManager
 * Pool state is stored at: keccak256(abi.encode(poolId, POOLS_SLOT))
 */
function getPoolStateBaseSlot(poolId: `0x${string}`): `0x${string}` {
  // Mapping slot = keccak256(key . slot)
  // For pool mapping: keccak256(poolId (32 bytes) ++ POOLS_SLOT (32 bytes))
  const slotData = (poolId + pad(toHex(POOLS_SLOT), { size: 32 }).slice(2)) as `0x${string}`;
  return keccak256(slotData);
}

/**
 * Decode Slot0 from raw bytes32 value
 * Slot0 layout: | sqrtPriceX96 (160 bits) | tick (24 bits) | protocolFee (24 bits) | lpFee (24 bits) |
 * Actually in V4, Slot0 is packed as: sqrtPriceX96 (160) | tick (24) | protocolFee (24) | lpFee (24)
 * Total: 232 bits, fits in one slot
 */
function decodeSlot0(slot0Raw: `0x${string}`): { sqrtPriceX96: bigint; tick: number; protocolFee: number; lpFee: number } {
  const value = hexToBigInt(slot0Raw);

  // Extract fields from packed data (right to left, LSB first)
  const lpFee = Number(value & 0xFFFFFFn);           // 24 bits
  const protocolFee = Number((value >> 24n) & 0xFFFFFFn);  // 24 bits
  const tick = Number((value >> 48n) & 0xFFFFFFn);   // 24 bits (signed)
  const sqrtPriceX96 = (value >> 72n) & ((1n << 160n) - 1n); // 160 bits

  // Convert tick to signed int24
  const signedTick = tick > 0x7FFFFF ? tick - 0x1000000 : tick;

  return { sqrtPriceX96, tick: signedTick, protocolFee, lpFee };
}

/**
 * Calculate price from sqrtPriceX96
 * price = (sqrtPriceX96 / 2^96)^2
 */
function calculatePrice(sqrtPriceX96: bigint, decimals0: number, decimals1: number): number {
  if (sqrtPriceX96 === 0n) return 0;

  // price = (sqrtPriceX96 / 2^96)^2 = sqrtPriceX96^2 / 2^192
  const Q96 = 2n ** 96n;
  const numerator = sqrtPriceX96 * sqrtPriceX96;
  const denominator = Q96 * Q96;

  // Adjust for decimals: price * 10^(decimals0 - decimals1)
  const decimalAdjustment = 10 ** (decimals0 - decimals1);

  // Convert to number for display
  const priceRaw = Number(numerator * BigInt(Math.floor(decimalAdjustment * 1e18)) / denominator) / 1e18;
  return priceRaw;
}

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

  // Fetch token decimals
  const fetchTokenDecimals = useCallback(
    async (address: string): Promise<number> => {
      if (
        !address ||
        address === "0x0000000000000000000000000000000000000000"
      ) {
        return 18; // ETH decimals
      }

      if (!publicClient) return 18;

      try {
        const decimals = (await publicClient.readContract({
          address: address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "decimals",
        } as any)) as number;
        return decimals || 18;
      } catch {
        return 18;
      }
    },
    [publicClient],
  );

  // Fetch token balance in PoolManager
  const fetchPoolBalance = useCallback(
    async (tokenAddress: string): Promise<bigint> => {
      if (
        !tokenAddress ||
        tokenAddress === "0x0000000000000000000000000000000000000000"
      ) {
        // For ETH, get PoolManager ETH balance
        if (!publicClient) return 0n;
        try {
          const balance = await publicClient.getBalance({
            address: CONTRACTS.POOL_MANAGER as `0x${string}`,
          });
          return balance;
        } catch {
          return 0n;
        }
      }

      if (!publicClient) return 0n;

      try {
        const balance = (await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [CONTRACTS.POOL_MANAGER as `0x${string}`],
        } as any)) as bigint;
        return balance;
      } catch {
        return 0n;
      }
    },
    [publicClient],
  );

  // Fetch pool state using extsload
  const fetchPoolState = useCallback(
    async (poolId: `0x${string}`): Promise<{ sqrtPriceX96: bigint; tick: number; liquidity: bigint }> => {
      if (!publicClient) {
        return { sqrtPriceX96: 0n, tick: 0, liquidity: 0n };
      }

      try {
        // Calculate base slot for this pool
        const baseSlot = getPoolStateBaseSlot(poolId);

        // Slot0 is at baseSlot + 0
        // Liquidity is at baseSlot + 1 (or different offset in V4)
        const slot0Result = (await publicClient.readContract({
          address: CONTRACTS.POOL_MANAGER as `0x${string}`,
          abi: POOL_MANAGER_ABI,
          functionName: "extsload",
          args: [baseSlot],
        } as any)) as `0x${string}`;

        // Decode Slot0
        const { sqrtPriceX96, tick } = decodeSlot0(slot0Result);

        // Liquidity is typically at baseSlot + 3 in V4 Pool.State struct
        // struct State { Slot0 slot0; uint256 feeGrowthGlobal0X128; uint256 feeGrowthGlobal1X128; uint128 liquidity; }
        const liquiditySlot = toHex(hexToBigInt(baseSlot) + 3n, { size: 32 });
        const liquidityResult = (await publicClient.readContract({
          address: CONTRACTS.POOL_MANAGER as `0x${string}`,
          abi: POOL_MANAGER_ABI,
          functionName: "extsload",
          args: [liquiditySlot as `0x${string}`],
        } as any)) as `0x${string}`;

        const liquidity = hexToBigInt(liquidityResult) & ((1n << 128n) - 1n); // uint128

        console.log(`[POOLS] Pool ${poolId.slice(0, 10)}... state:`, {
          sqrtPriceX96: sqrtPriceX96.toString(),
          tick,
          liquidity: liquidity.toString(),
        });

        return { sqrtPriceX96, tick, liquidity };
      } catch (err) {
        console.error("Error fetching pool state:", err);
        return { sqrtPriceX96: 0n, tick: 0, liquidity: 0n };
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

          // Fetch token info
          const [token0Symbol, token1Symbol, decimals0, decimals1] = await Promise.all([
            fetchTokenSymbol(poolKey.currency0),
            fetchTokenSymbol(poolKey.currency1),
            fetchTokenDecimals(poolKey.currency0),
            fetchTokenDecimals(poolKey.currency1),
          ]);

          // Fetch actual pool state from PoolManager
          const { sqrtPriceX96, tick, liquidity } = await fetchPoolState(poolId as `0x${string}`);

          // Calculate price
          const price = calculatePrice(sqrtPriceX96, decimals0, decimals1);

          // Fetch token balances in PoolManager for TVL estimation
          const [balance0, balance1] = await Promise.all([
            fetchPoolBalance(poolKey.currency0),
            fetchPoolBalance(poolKey.currency1),
          ]);

          // Calculate TVL (simplified - sum of balances in USD terms)
          // For now, just format as token amounts
          const tvl0 = Number(formatUnits(balance0, decimals0));
          const tvl1 = Number(formatUnits(balance1, decimals1));
          const tvlEstimate = tvl0 + tvl1 * price; // Rough estimate

          // Display fee as percentage
          // In Uniswap V4, dynamic fees have DYNAMIC_FEE_FLAG (0x800000)
          const baseFee = poolKey.fee & 0x7FFFFF; // Remove dynamic flag
          const feePercentage = baseFee / 10000; // Convert bps to percent

          poolsData.push({
            id: poolId as `0x${string}`,
            poolKey: {
              currency0: poolKey.currency0,
              currency1: poolKey.currency1,
              fee: poolKey.fee,
              tickSpacing: poolKey.tickSpacing,
              hooks: poolKey.hooks,
            },
            sqrtPriceX96,
            tick,
            liquidity,
            feeGrowthGlobal0X128: 0n, // Would need another extsload call
            feeGrowthGlobal1X128: 0n,
            tvl: tvlEstimate > 0 ? tvlEstimate.toFixed(2) : liquidity > 0n ? "Active" : "0.00",
            volume24h: "N/A", // Would need event indexing
            fees24h: "N/A",
            apy: liquidity > 0n ? `${feePercentage.toFixed(2)}%` : "0.00%",
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
  }, [publicClient, poolIds, fetchTokenSymbol, fetchTokenDecimals, fetchPoolState, fetchPoolBalance]);

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
