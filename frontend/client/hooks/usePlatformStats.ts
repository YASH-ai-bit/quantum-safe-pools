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
      // Filter out dark pools from statistics (they have PRIVATE values)
      const publicPools = pools.filter(pool => pool.poolType !== 'dark');

      // Calculate total TVL from public pools only
      const totalTVL = publicPools.reduce((sum, pool) => {
        const tvl = parseFloat(pool.tvl || '0');
        return sum + (isNaN(tvl) ? 0 : tvl);
      }, 0);

      // Calculate average APY from public pools only
      const totalAPY = publicPools.reduce((sum, pool) => {
        const apy = parseFloat(pool.apy?.replace('%', '') || '0');
        return sum + (isNaN(apy) ? 0 : apy);
      }, 0);
      const avgAPY = publicPools.length > 0 ? (totalAPY / publicPools.length).toFixed(2) : '0';

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
        liquidityPools: publicPools.length.toString(), // Count public pools only
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
