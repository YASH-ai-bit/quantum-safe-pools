import { ethers } from 'ethers';

/**
 * Calculate pool metrics from on-chain data
 */

export interface PoolMetrics {
  tvl: string;
  volume24h: string;
  fees24h: string;
  apy: string;
  impermanentLoss: string;
}

/**
 * Calculate TVL from pool reserves
 */
export function calculateTVL(
  reserve0: bigint,
  reserve1: bigint,
  price0: number,
  price1: number
): string {
  const value0 = Number(ethers.formatEther(reserve0)) * price0;
  const value1 = Number(ethers.formatEther(reserve1)) * price1;
  return (value0 + value1).toFixed(2);
}

/**
 * Calculate 24h volume from swap events
 */
export function calculateVolume24h(swapEvents: Array<{
  amount0: bigint;
  amount1: bigint;
  timestamp: number;
}>): string {
  const oneDayAgo = Date.now() / 1000 - 86400;
  const recentSwaps = swapEvents.filter(e => e.timestamp > oneDayAgo);
  
  const totalVolume = recentSwaps.reduce((sum, swap) => {
    // Simplified: use absolute value of swaps
    return sum + Number(ethers.formatEther(swap.amount0 > 0n ? swap.amount0 : -swap.amount0));
  }, 0);

  return totalVolume.toFixed(2);
}

/**
 * Calculate 24h fees from fee growth
 */
export function calculateFees24h(
  feeGrowth0: bigint,
  feeGrowth1: bigint,
  liquidity: bigint,
  previousFeeGrowth0: bigint,
  previousFeeGrowth1: bigint
): string {
  const feeGrowthDelta0 = feeGrowth0 - previousFeeGrowth0;
  const feeGrowthDelta1 = feeGrowth1 - previousFeeGrowth1;
  
  // Fees = (feeGrowthDelta * liquidity) / 2^128
  const fees0 = Number(feeGrowthDelta0) * Number(liquidity) / Math.pow(2, 128);
  const fees1 = Number(feeGrowthDelta1) * Number(liquidity) / Math.pow(2, 128);
  
  // Simplified: assume 1:1 price ratio for fee calculation
  return (fees0 + fees1).toFixed(2);
}

/**
 * Calculate APY from fees and TVL
 */
export function calculateAPY(fees24h: string, tvl: string): string {
  const fees = parseFloat(fees24h);
  const totalValue = parseFloat(tvl);
  
  if (totalValue === 0) return '0.00';
  
  // APY = (fees24h * 365 / tvl) * 100
  const apy = (fees * 365 / totalValue) * 100;
  return apy.toFixed(2);
}

/**
 * Calculate impermanent loss
 * IL = 2 * sqrt(priceRatio) / (1 + priceRatio) - 1
 */
export function calculateImpermanentLoss(
  initialPrice: number,
  currentPrice: number
): string {
  if (initialPrice === 0 || currentPrice === 0) return '0.00';
  
  const priceRatio = currentPrice / initialPrice;
  const il = (2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1) * 100;
  
  return il.toFixed(2);
}

/**
 * Get comprehensive pool metrics
 */
export async function getPoolMetrics(
  poolId: string,
  poolManager: ethers.Contract,
  provider: ethers.Provider
): Promise<PoolMetrics> {
  try {
    // Get current pool state
    const slot0 = await poolManager.getSlot0(poolId);
    const liquidity = await poolManager.getLiquidity(poolId);
    const feeGrowth = await poolManager.getFeeGrowthGlobal(poolId);

    // Get swap events for volume calculation
    const filter = poolManager.filters.Swap();
    const events = await provider.getLogs({
      fromBlock: 'latest' - 6500, // ~24 hours on Ethereum
      toBlock: 'latest',
      address: await poolManager.getAddress(),
      topics: filter.topics,
    });

    // Parse swap events
    const swapEvents = events.map((log) => {
      const parsed = poolManager.interface.parseLog(log);
      return {
        amount0: parsed?.args.amount0 || 0n,
        amount1: parsed?.args.amount1 || 0n,
        timestamp: (await provider.getBlock(log.blockNumber))?.timestamp || 0,
      };
    });

    // Calculate metrics (simplified - would need price oracles for accurate TVL)
    const tvl = '0.00'; // Would need token prices
    const volume24h = calculateVolume24h(swapEvents);
    const fees24h = '0.00'; // Would need previous fee growth
    const apy = calculateAPY(fees24h, tvl);
    const impermanentLoss = '0.00'; // Would need initial price

    return {
      tvl,
      volume24h,
      fees24h,
      apy,
      impermanentLoss,
    };
  } catch (error) {
    console.error('Error calculating pool metrics:', error);
    return {
      tvl: '0.00',
      volume24h: '0.00',
      fees24h: '0.00',
      apy: '0.00',
      impermanentLoss: '0.00',
    };
  }
}
