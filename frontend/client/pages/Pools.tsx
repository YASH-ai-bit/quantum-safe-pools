import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  Search,
  Plus,
  TrendingUp,
  Users,
  BarChart3,
  Lock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { usePools } from "@/hooks/usePools";
import { ethers } from "ethers";

function formatAddress(address: string): string {
  if (!address) return "Unknown";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Pools() {
  const [searchQuery, setSearchQuery] = useState("");
  const { pools, loading, error } = usePools();

  // Calculate aggregate stats (exclude dark pools from numeric aggregates)
  const totalTVL = pools.reduce((sum, pool) => {
    const tvl = pool.tvl === "PRIVATE" ? 0 : parseFloat(pool.tvl || "0");
    return sum + tvl;
  }, 0);

  const publicPools = pools.filter((p) => p.poolType === "normal");
  const avgAPY =
    publicPools.length > 0
      ? publicPools.reduce(
        (sum, pool) => sum + parseFloat(pool.apy || "0"),
        0,
      ) / publicPools.length
      : 0;

  const filteredPools = pools.filter((pool) => {
    const pair = `${pool.token0Symbol || formatAddress(pool.poolKey.currency0)}-${pool.token1Symbol || formatAddress(pool.poolKey.currency1)}`;
    return pair.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Header />

      <main className="flex-1 pt-20 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2 pixel-text text-foreground">
                LIQUIDITY_POOLS
              </h1>
              <p className="text-foreground/60 pixel-text">
                Explore and manage quantum-safe liquidity pools
              </p>
            </div>
            <Link to="/create-pool">
              <button className="px-6 py-3 border-2 border-primary text-primary font-bold flex items-center gap-2 hover:bg-primary hover:text-black transition-all pixel-text whitespace-nowrap glitch-hover">
                <Plus className="w-5 h-5" />
                CREATE_POOL
              </button>
            </Link>
          </div>

          {/* Search and Filters */}
          <div className="secondary-border p-6 mb-8 glitch-hover">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                <input
                  type="text"
                  placeholder="$ search_pools (e.g., BTC-ETH)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-black text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary border-0 pixel-text"
                />
              </div>
              <select className="px-4 py-3 bg-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary border-2 border-primary pixel-text">
                <option>$ all</option>
                <option>$ high_apy</option>
                <option>$ high_tvl</option>
                <option>$ low_fee</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="secondary-border p-6 text-center glitch-hover">
              <p className="text-foreground/60 text-sm mb-2 pixel-text">
                $ TVL
              </p>
              <p className="text-3xl font-bold text-foreground pixel-text">
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                ) : (
                  `$${totalTVL.toFixed(2)}`
                )}
              </p>
            </div>
            <div className="secondary-border p-6 text-center glitch-hover">
              <p className="text-foreground/60 text-sm mb-2 pixel-text">
                $ AVG_APY
              </p>
              <p className="text-3xl font-bold text-primary pixel-text">
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                ) : (
                  `${avgAPY.toFixed(2)}%`
                )}
              </p>
            </div>
            <div className="secondary-border p-6 text-center glitch-hover">
              <p className="text-foreground/60 text-sm mb-2 pixel-text">
                $ POOLS
              </p>
              <p className="text-3xl font-bold text-foreground pixel-text">
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                ) : (
                  filteredPools.length
                )}
              </p>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="border-2 border-red-500 p-4 mb-8 glitch-hover">
              <p className="text-red-500 pixel-text">Error: {error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && pools.length === 0 && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 pixel-text text-foreground">
                LOADING_POOLS...
              </h3>
            </div>
          )}

          {/* Pools Grid */}
          {!loading && filteredPools.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPools.map((pool) => {
                const pair = `${pool.token0Symbol || formatAddress(pool.poolKey.currency0)}-${pool.token1Symbol || formatAddress(pool.poolKey.currency1)}`;
                const feePercent = (pool.poolKey.fee / 10000).toFixed(2);
                return (
                  <div
                    key={pool.id}
                    className="border-2 border-primary p-6 group hover:bg-primary/10 transition-all duration-300 flex flex-col glitch-hover"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="pixel-text">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-foreground">
                            {pair}
                          </h3>
                          {pool.poolType === "dark" && (
                            <span className="px-2 py-1 text-xs border border-purple-500 text-purple-400 pixel-text flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              DARK
                            </span>
                          )}
                        </div>
                        <div className="group/fee relative">
                          <p className="text-foreground/60 text-sm cursor-help border-b border-dashed border-foreground/30 inline-block">
                            {feePercent}% fee
                          </p>
                          {feePercent === "0.30" && (
                            <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-primary text-black text-xs font-bold rounded opacity-0 group-hover/fee:opacity-100 transition-opacity pointer-events-none z-10 text-center shadow-lg border-2 border-primary-foreground">
                              Standard Tier. Become a QS to unlock lower fees!
                              <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-primary"></div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-2 border-2 border-primary group-hover:bg-primary/20 transition">
                        <TrendingUp className="w-5 h-5 text-primary" />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="space-y-3 mb-6 flex-1 pixel-text">
                      {pool.poolType === "dark" ? (
                        <div className="text-center py-4 border border-purple-500/20 bg-purple-500/5">
                          <Lock className="w-8 h-8 text-purple-500 mx-auto mb-2 opacity-50" />
                          <p className="text-purple-400 text-xs text-center px-2">
                            METRICS_HIDDEN
                            <br />
                            <span className="text-purple-400/60 text-[10px]">ENHANCED_PRIVACY</span>
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-foreground/60">tvl</span>
                            <span className="font-bold text-foreground">
                              ${pool.tvl || "0.00"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-foreground/60">apy</span>
                            <span className="font-bold text-primary">
                              {pool.apy || "0.00"}%
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Action Button */}
                    <Link to={`/pool/${pool.id}`}>
                      <button className="w-full py-3 border-2 border-primary text-primary hover:bg-primary hover:text-black font-bold transition-all duration-300 flex items-center justify-center gap-2 group/btn pixel-text text-sm glitch-hover">
                        VIEW_POOL
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && filteredPools.length === 0 && (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 pixel-text text-foreground">
                NO_POOLS_FOUND
              </h3>
              <p className="text-foreground/60 pixel-text">
                {pools.length === 0
                  ? "No pools created yet. "
                  : "Try adjusting your search or "}
                <Link
                  to="/create-pool"
                  className="text-primary hover:text-primary/80 transition"
                >
                  create a new pool
                </Link>
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
