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

// QuantumAMMPool ABI for events
const QUANTUM_POOL_ABI = [
  "event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)"
];

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
  amount0In: bigint;
  amount0Out: bigint;
  timestamp: number;
}>): string {
  const oneDayAgo = Date.now() / 1000 - 86400;
  const recentSwaps = swapEvents.filter(e => e.timestamp > oneDayAgo);

  const totalVolume = recentSwaps.reduce((sum, swap) => {
    // Volume is sum of inputs and outputs for token0 (simplified representation)
    // Typically volume is tracked in USD or one token. Here we sum token0 flow.
    return sum + Number(ethers.formatEther(swap.amount0In + swap.amount0Out));
  }, 0);

  return totalVolume.toFixed(2);
}

/**
 * Calculate 24h fees from fee growth
 * For Quantum AMM, fees are collected in the pool.
 * We can estimate fees from volume * feeRate (0.3% standard).
 */
export function calculateFees24h(
  volume24h: string,
  feeRate: number = 0.003
): string {
  const vol = parseFloat(volume24h);
  return (vol * feeRate).toFixed(2);
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
  poolAddress: string,
  provider: ethers.Provider
): Promise<PoolMetrics> {
  try {
    const poolContract = new ethers.Contract(poolAddress, QUANTUM_POOL_ABI, provider);

    // Get swap events for volume calculation
    const filter = poolContract.filters.Swap();
    const currentBlock = await provider.getBlockNumber();
    const events = await provider.getLogs({
      fromBlock: currentBlock - 6500, // ~24 hours on Ethereum
      toBlock: 'latest',
      address: poolAddress,
      topics: await filter.getTopicFilter(),
    });

    // Parse swap events
    const swapEvents = await Promise.all(events.map(async (log) => {
      const parsed = poolContract.interface.parseLog(log);
      const block = await provider.getBlock(log.blockNumber);
      return {
        amount0In: parsed?.args.amount0In || 0n,
        amount0Out: parsed?.args.amount0Out || 0n,
        timestamp: block?.timestamp || 0,
      };
    }));

    // Calculate metrics
    const volume24h = calculateVolume24h(swapEvents);
    const fees24h = calculateFees24h(volume24h);

    // TVL would need external price data or reserves fetching
    // For now we return 0.00 if not passed in, but the hook usually calculates TVL.
    const tvl = '0.00';
    const apy = calculateAPY(fees24h, tvl);
    const impermanentLoss = '0.00';

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
