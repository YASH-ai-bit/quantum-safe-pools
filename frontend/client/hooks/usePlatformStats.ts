import { usePools } from './usePools';
import { useState, useEffect } from 'react';

export function usePlatformStats() {
  const { pools, loading } = usePools();
  const [stats, setStats] = useState({
    totalTVL: '0',
    avgAPY: '0%',
    liquidityPools: '0',
    uptime: '99.99%', // This would come from monitoring service
  });

  useEffect(() => {
    if (!loading && pools.length > 0) {
      // Calculate total TVL from all pools
      const totalTVL = pools.reduce((sum, pool) => {
        return sum + parseFloat(pool.tvl || '0');
      }, 0);

      // Calculate average APY
      const totalAPY = pools.reduce((sum, pool) => {
        const apy = parseFloat(pool.apy?.replace('%', '') || '0');
        return sum + apy;
      }, 0);
      const avgAPY = pools.length > 0 ? (totalAPY / pools.length).toFixed(2) : '0';

      // Format TVL
      let tvlFormatted = '0';
      if (totalTVL >= 1000000000) {
        tvlFormatted = `$${(totalTVL / 1000000000).toFixed(1)}B`;
      } else if (totalTVL >= 1000000) {
        tvlFormatted = `$${(totalTVL / 1000000).toFixed(1)}M`;
      } else if (totalTVL >= 1000) {
        tvlFormatted = `$${(totalTVL / 1000).toFixed(1)}K`;
      } else {
        tvlFormatted = `$${totalTVL.toFixed(0)}`;
      }

      setStats({
        totalTVL: tvlFormatted,
        avgAPY: `${avgAPY}%`,
        liquidityPools: pools.length.toString(),
        uptime: '99.99%',
      });
    } else if (!loading) {
      setStats({
        totalTVL: '0',
        avgAPY: '0%',
        liquidityPools: '0',
        uptime: '99.99%',
      });
    }
  }, [pools, loading]);

  return { stats, loading };
}
