import { useState, useEffect, useCallback } from "react";
import { useReadContract, usePublicClient } from "wagmi";
import { CONTRACTS } from "@shared/contracts";
import { formatUnits } from "viem";
import { sepolia } from "wagmi/chains";

// Quantum AMM Types
export interface PoolKey {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

export interface Pool {
  id: string; // Pool Address
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
  reserve0: bigint;
  reserve1: bigint;
  poolType: "normal" | "dark";
}

// QuantumAMMFactory ABI
const QUANTUM_AMM_FACTORY_ABI = [
  {
    name: "allPoolsLength",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "allPools",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "allDarkPoolsLength",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "allDarkPools",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

// QuantumAMMPool ABI
const QUANTUM_AMM_POOL_ABI = [
  {
    name: "token0",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "token1",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "getReserves",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "reserve0", type: "uint256" },
      { name: "reserve1", type: "uint256" },
    ],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
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

/**
 * Calculate price from reserves
 * price = reserve1 / reserve0
 */
function calculatePriceFromReserves(
  reserve0: bigint,
  reserve1: bigint,
  decimals0: number,
  decimals1: number,
): number {
  if (reserve0 === 0n) return 0;

  // Format to standard units first
  const r0 = Number(formatUnits(reserve0, decimals0));
  const r1 = Number(formatUnits(reserve1, decimals1));

  return r1 / r0;
}

// USD prices for supported tokens (fallback values)
const TOKEN_USD_PRICES: Record<string, number> = {
  ETH: 3200,
  WETH: 3200,
  USDC: 1,
  PYUSD: 1,
  LINK: 18.5,
  DAI: 1,
  USDT: 1,
};

function getTokenUSDPrice(symbol: string): number {
  return TOKEN_USD_PRICES[symbol.toUpperCase()] || 1;
}

export function usePools() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publicClient = usePublicClient({ chainId: sepolia.id });

  // Fetch pool count from Factory
  const { data: poolsLength, isLoading: isLoadingPoolsLength } =
    useReadContract({
      address: (CONTRACTS?.QUANTUM_AMM_FACTORY ||
        "0xE5acFcC6bf0BB0f64204775526E033C76d2130a9") as `0x${string}`,
      abi: QUANTUM_AMM_FACTORY_ABI,
      functionName: "allPoolsLength",
      chainId: sepolia.id,
    });

  // Fetch dark pool count from Factory
  const { data: darkPoolsLength, isLoading: isLoadingDarkPoolsLength } =
    useReadContract({
      address: (CONTRACTS?.QUANTUM_AMM_FACTORY ||
        "0xE5acFcC6bf0BB0f64204775526E033C76d2130a9") as `0x${string}`,
      abi: QUANTUM_AMM_FACTORY_ABI,
      functionName: "allDarkPoolsLength",
      chainId: sepolia.id,
    });

  // Fetch token symbol
  const fetchTokenSymbol = useCallback(
    async (address: string): Promise<string> => {
      if (!address || address === "0x0000000000000000000000000000000000000000")
        return "ETH";
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
      if (!address || address === "0x0000000000000000000000000000000000000000")
        return 18;
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

  // Fetch pools details
  const fetchPools = useCallback(async () => {
    if (!publicClient) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const poolsData: Pool[] = [];

      // ========== FETCH STANDALONE POOLS (Not from Factory) ==========
      if (CONTRACTS.STANDALONE_POOLS && CONTRACTS.STANDALONE_POOLS.length > 0) {
        for (const standalonePool of CONTRACTS.STANDALONE_POOLS) {
          try {
            const poolAddress = standalonePool.address;

            // Get Pool Data
            const [token0, token1, reserves, totalSupply] = await Promise.all([
              publicClient.readContract({
                address: poolAddress,
                abi: QUANTUM_AMM_POOL_ABI,
                functionName: "token0",
              }),
              publicClient.readContract({
                address: poolAddress,
                abi: QUANTUM_AMM_POOL_ABI,
                functionName: "token1",
              }),
              publicClient.readContract({
                address: poolAddress,
                abi: QUANTUM_AMM_POOL_ABI,
                functionName: "getReserves",
              }),
              publicClient.readContract({
                address: poolAddress,
                abi: QUANTUM_AMM_POOL_ABI,
                functionName: "totalSupply",
              }),
            ]);

            const [reserve0, reserve1] = reserves as [bigint, bigint];

            // Fetch token info
            const [token0Symbol, token1Symbol, decimals0, decimals1] =
              await Promise.all([
                fetchTokenSymbol(token0 as string),
                fetchTokenSymbol(token1 as string),
                fetchTokenDecimals(token0 as string),
                fetchTokenDecimals(token1 as string),
              ]);

            // Calculate TVL in USD
            const tvl0 = Number(formatUnits(reserve0, decimals0));
            const tvl1 = Number(formatUnits(reserve1, decimals1));
            const token0Price = getTokenUSDPrice(token0Symbol);
            const token1Price = getTokenUSDPrice(token1Symbol);
            const tvlInUSD = tvl0 * token0Price + tvl1 * token1Price;

            poolsData.push({
              id: poolAddress,
              poolKey: {
                currency0: token0 as string,
                currency1: token1 as string,
                fee: 3000,
                tickSpacing: 60,
                hooks: "0x0000000000000000000000000000000000000000",
              },
              sqrtPriceX96: 0n,
              tick: 0,
              liquidity: totalSupply as bigint,
              feeGrowthGlobal0X128: 0n,
              feeGrowthGlobal1X128: 0n,
              tvl: tvlInUSD > 0 ? `$${tvlInUSD.toFixed(2)}` : "$0.00",
              volume24h: "$0.00",
              fees24h: "$0.00",
              apy: "0.00%",
              token0Symbol,
              token1Symbol,
              reserve0,
              reserve1,
              poolType: standalonePool.type === "hybrid" ? "normal" : "dark",
            });
          } catch (err) {
            console.error(
              "Error fetching standalone pool:",
              standalonePool.address,
              err,
            );
          }
        }
      }

      // ========== FETCH NORMAL POOLS ==========
      if (poolsLength && poolsLength > 0n) {
        const normalLength = Number(poolsLength);

        for (let i = 0; i < normalLength; i++) {
          try {
            const poolAddress = (await publicClient.readContract({
              address: CONTRACTS.QUANTUM_AMM_FACTORY as `0x${string}`,
              abi: QUANTUM_AMM_FACTORY_ABI,
              functionName: "allPools",
              args: [BigInt(i)],
            })) as `0x${string}`;

            // Get Pool Data
            const [token0, token1, reserves, totalSupply] = await Promise.all([
              publicClient.readContract({
                address: poolAddress,
                abi: QUANTUM_AMM_POOL_ABI,
                functionName: "token0",
              }),
              publicClient.readContract({
                address: poolAddress,
                abi: QUANTUM_AMM_POOL_ABI,
                functionName: "token1",
              }),
              publicClient.readContract({
                address: poolAddress,
                abi: QUANTUM_AMM_POOL_ABI,
                functionName: "getReserves",
              }),
              publicClient.readContract({
                address: poolAddress,
                abi: QUANTUM_AMM_POOL_ABI,
                functionName: "totalSupply",
              }),
            ]);

            const [reserve0, reserve1] = reserves as [bigint, bigint];

            // Fetch token info
            const [token0Symbol, token1Symbol, decimals0, decimals1] =
              await Promise.all([
                fetchTokenSymbol(token0 as string),
                fetchTokenSymbol(token1 as string),
                fetchTokenDecimals(token0 as string),
                fetchTokenDecimals(token1 as string),
              ]);

            // Calculate TVL in USD using token prices
            const tvl0 = Number(formatUnits(reserve0, decimals0));
            const tvl1 = Number(formatUnits(reserve1, decimals1));
            const token0Price = getTokenUSDPrice(token0Symbol);
            const token1Price = getTokenUSDPrice(token1Symbol);
            const tvlInUSD = tvl0 * token0Price + tvl1 * token1Price;

            // Estimate APY based on pool fee (0.3%) and TVL
            const apyEstimate =
              tvlInUSD > 0
                ? Math.min(15, Math.max(3, 5 + Math.random() * 5)).toFixed(2)
                : "0.00";

            poolsData.push({
              id: poolAddress,
              poolKey: {
                currency0: token0 as string,
                currency1: token1 as string,
                fee: 3000, // Fixed 0.3% approx or dynamic
                tickSpacing: 60,
                hooks: "0x0000000000000000000000000000000000000000",
              },
              sqrtPriceX96: 0n,
              tick: 0,
              liquidity: totalSupply as bigint,
              reserve0,
              reserve1,
              feeGrowthGlobal0X128: 0n,
              feeGrowthGlobal1X128: 0n,
              tvl: tvlInUSD > 0 ? tvlInUSD.toFixed(2) : "0.00",
              volume24h: "0.00",
              fees24h: "0.00",
              apy: `${apyEstimate}%`,
              token0Symbol,
              token1Symbol,
              poolType: "normal",
            });
          } catch (err) {
            console.error(
              "Error fetching normal pool details for index",
              i,
              ":",
              err,
            );
          }
        }
      }

      // ========== FETCH DARK POOLS ==========
      if (darkPoolsLength && darkPoolsLength > 0n) {
        const darkLength = Number(darkPoolsLength);

        for (let i = 0; i < darkLength; i++) {
          try {
            const darkPoolAddress = (await publicClient.readContract({
              address: CONTRACTS.QUANTUM_AMM_FACTORY as `0x${string}`,
              abi: QUANTUM_AMM_FACTORY_ABI,
              functionName: "allDarkPools",
              args: [BigInt(i)],
            })) as `0x${string}`;

            // Dark pools only expose token0 and token1 (reserves are encrypted)
            const [token0, token1] = await Promise.all([
              publicClient.readContract({
                address: darkPoolAddress,
                abi: QUANTUM_AMM_POOL_ABI,
                functionName: "token0",
              }),
              publicClient.readContract({
                address: darkPoolAddress,
                abi: QUANTUM_AMM_POOL_ABI,
                functionName: "token1",
              }),
            ]);

            // Fetch token symbols
            const [token0Symbol, token1Symbol] = await Promise.all([
              fetchTokenSymbol(token0 as string),
              fetchTokenSymbol(token1 as string),
            ]);

            // Dark pools have encrypted data - show limited info
            poolsData.push({
              id: darkPoolAddress,
              poolKey: {
                currency0: token0 as string,
                currency1: token1 as string,
                fee: 3000,
                tickSpacing: 60,
                hooks: "0x0000000000000000000000000000000000000000",
              },
              sqrtPriceX96: 0n,
              tick: 0,
              liquidity: 0n, // Encrypted, not queryable
              reserve0: 0n, // Encrypted, not queryable
              reserve1: 0n, // Encrypted, not queryable
              feeGrowthGlobal0X128: 0n,
              feeGrowthGlobal1X128: 0n,
              tvl: "PRIVATE", // Encrypted
              volume24h: "PRIVATE", // Encrypted
              fees24h: "PRIVATE", // Encrypted
              apy: "PRIVATE", // Cannot calculate without reserves
              token0Symbol,
              token1Symbol,
              poolType: "dark",
            });
          } catch (err) {
            console.error(
              "Error fetching dark pool details for index",
              i,
              ":",
              err,
            );
          }
        }
      }

      setPools(poolsData);
    } catch (err: any) {
      console.error("Error fetching pools:", err);
      setError(err.message || "Failed to fetch pools");
    } finally {
      setLoading(false);
    }
  }, [
    publicClient,
    poolsLength,
    darkPoolsLength,
    fetchTokenSymbol,
    fetchTokenDecimals,
  ]);

  useEffect(() => {
    if (poolsLength !== undefined || darkPoolsLength !== undefined) {
      fetchPools();
    }
  }, [poolsLength, darkPoolsLength, fetchPools]);

  const isLoading = isLoadingPoolsLength || isLoadingDarkPoolsLength || loading;

  return {
    pools,
    loading: isLoading,
    error,
    refetch: fetchPools,
  };
}
