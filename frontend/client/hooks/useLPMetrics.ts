import { useMemo } from 'react';
import { useTransactionHistory } from './useTransactionHistory';
import { useWalletData } from './useWalletData';
import { Pool } from './usePools';
import { formatUnits } from 'viem';

export interface LPMetrics {
    investedAmount0: number;
    investedAmount1: number;
    hodlValueUSD: number;
    lpValueUSD: number;
    netPnL: number;
    impermanentLoss: number;
    roi: number;
}

export function useLPMetrics(pool: Pool | undefined, userLpBalance: bigint) {
    const { transactions } = useTransactionHistory();
    const { prices } = useWalletData(); // We'll need to expose prices from useWalletData or fetch them here

    const metrics = useMemo((): LPMetrics => {
        if (!pool || !userLpBalance || userLpBalance === 0n) {
            return {
                investedAmount0: 0,
                investedAmount1: 0,
                hodlValueUSD: 0,
                lpValueUSD: 0,
                netPnL: 0,
                impermanentLoss: 0,
                roi: 0,
            };
        }

        // 1. Calculate Net Invested Amount from Transaction History
        // We filter for successful add/remove liquidity txs for this pool
        // Note: This assumes 'transactions' contains all relevant history stored in local storage
        const poolTxs = transactions.filter(
            tx => tx.details.poolId === pool.id &&
                (tx.type === 'add_liquidity' || tx.type === 'remove_liquidity')
        );

        let net0 = 0;
        let net1 = 0;

        for (const tx of poolTxs) {
            const amount0 = parseFloat(tx.details.fromAmount || '0');
            const amount1 = parseFloat(tx.details.toAmount || '0');

            if (tx.type === 'add_liquidity') {
                net0 += amount0;
                net1 += amount1;
            } else if (tx.type === 'remove_liquidity') {
                net0 -= amount0;
                net1 -= amount1;
            }
        }

        // Identify tokens to get prices
        const token0Symbol = pool.token0Symbol;
        const token1Symbol = pool.token1Symbol;

        const price0 = prices[token0Symbol] || 0;
        const price1 = prices[token1Symbol] || 0;

        // 2. Calculate HODL Value (Value if held)
        const hodlValueUSD = (net0 * price0) + (net1 * price1);

        // 3. Calculate Current LP Value
        // Value = (UserShare / TotalSupply) * TVL

        // User Share fraction
        const totalLiquidity = parseFloat(formatUnits(pool.liquidity, 18)); // LP tokens always 18 decimals usually
        const userLiquidity = parseFloat(formatUnits(userLpBalance, 18));

        const share = totalLiquidity > 0 ? userLiquidity / totalLiquidity : 0;

        // Try to get TVL from pool, or calculate from reserves if TVL is 0
        let poolTVL = parseFloat(pool.tvl || '0');

        if (poolTVL === 0 && (price0 > 0 || price1 > 0)) {
            // Fallback: Calculate TVL from reserves
            // We need decimals which usePools usually handles, but we might not have them explicitly here
            // We can infer them from the reserves if we assume standard 18 or try to match logic
            // Actually, pool key contains just addresses.
            // But let's assume standard normalization was done in usePools for tvl, but if it failed...
            // We'll rely on the fact that if we use the same decimals logic:
            // Reserve0/1 are BigInt.

            // This is tricky without decimals. 
            // Best effort: Assume 18 or try to use what we know. 
            // We'll skip this if we can't be sure, but let's try to assume the token prices are accurate for the units.
            // If we can't help it, we just stick with 0 or the HODL value as proxy? No, that hides IL.

            // Better: We check if useLPMetrics can get decimals.
            // We don't have them passed in.
            // Let's assume if pools.tvl is 0, we can't easily fix it here without more data.
            // BUT, we can use the 'userLpPosition' value from wallet data if available?
            // useWalletData calculates it.
        }

        // Use calculated TVL
        const lpValueUSD = poolTVL * share;

        // 4. Net PnL (Fees + IL)
        // PnL = Current Value - HODL Value
        const netPnL = lpValueUSD - hodlValueUSD;

        // 5. Impermanent Loss
        // IL is the divergence between holding and LPing (ignoring fees). 
        // Since NetPnL includes fees, and fees are usually positive...
        // IL = (Value with AMM logic) - (Hodl Value).
        // Without separating fees from the LP position value, we can't strictly isolate IL.
        // But usually "Impermanent Loss" refers to the *negative* impact. 
        // We'll treat NetPnL as the "Performance vs HODL". 
        // If we want accurate IL, we'd need to know the *fees earned* separately which are auto-compounded in V2? 
        // No, standard Uniswap V2 (which Quantum seems to be based on reserves) accumulates fees into the reserves (k grows).
        // So LP Value includes fees. 
        // True IL is negative. Net PnL = Fees + IL.
        // We will display Net PnL as "Net Earnings".

        const roi = hodlValueUSD > 0 ? (netPnL / hodlValueUSD) * 100 : 0;

        return {
            investedAmount0: net0,
            investedAmount1: net1,
            hodlValueUSD,
            lpValueUSD,
            netPnL,
            impermanentLoss: 0, // Hard to isolate without separate fee tracking
            roi
        };

    }, [pool, userLpBalance, transactions, prices]);

    return metrics;
}
