import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Search, Plus, TrendingUp, Users, BarChart3, Lock, ArrowRight } from "lucide-react";
import { useState } from "react";

export default function Pools() {
  const [searchQuery, setSearchQuery] = useState("");

  const pools = [
    {
      id: 1,
      pair: "BTC-ETH",
      tvl: "$45.2M",
      apy: "18.5%",
      volume24h: "$8.3M",
      users: 2340,
      fee: "0.30%",
    },
    {
      id: 2,
      pair: "ETH-USDC",
      tvl: "$78.5M",
      apy: "22.3%",
      volume24h: "$12.5M",
      users: 5120,
      fee: "0.30%",
    },
    {
      id: 3,
      pair: "BTC-USDC",
      tvl: "$62.1M",
      apy: "19.8%",
      volume24h: "$10.2M",
      users: 3890,
      fee: "0.30%",
    },
    {
      id: 4,
      pair: "ETH-USDT",
      tvl: "$55.8M",
      apy: "20.5%",
      volume24h: "$9.7M",
      users: 4210,
      fee: "0.25%",
    },
    {
      id: 5,
      pair: "BTC-USDT",
      tvl: "$41.3M",
      apy: "17.2%",
      volume24h: "$7.8M",
      users: 2890,
      fee: "0.25%",
    },
    {
      id: 6,
      pair: "USDC-USDT",
      tvl: "$38.9M",
      apy: "5.2%",
      volume24h: "$15.3M",
      users: 6540,
      fee: "0.01%",
    },
  ];

  const filteredPools = pools.filter((pool) =>
    pool.pair.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Header />

      <main className="flex-1 pt-20 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2 pixel-text text-foreground">LIQUIDITY_POOLS</h1>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="secondary-border p-6 text-center glitch-hover">
              <p className="text-foreground/60 text-sm mb-2 pixel-text">$ TVL</p>
              <p className="text-3xl font-bold text-foreground pixel-text">$395.8M</p>
            </div>
            <div className="secondary-border p-6 text-center glitch-hover">
              <p className="text-foreground/60 text-sm mb-2 pixel-text">$ VOLUME</p>
              <p className="text-3xl font-bold text-foreground pixel-text">$63.8M</p>
            </div>
            <div className="secondary-border p-6 text-center glitch-hover">
              <p className="text-foreground/60 text-sm mb-2 pixel-text">$ AVG_APY</p>
              <p className="text-3xl font-bold text-primary pixel-text">16.9%</p>
            </div>
            <div className="secondary-border p-6 text-center glitch-hover">
              <p className="text-foreground/60 text-sm mb-2 pixel-text">$ POOLS</p>
              <p className="text-3xl font-bold text-foreground pixel-text">{filteredPools.length}</p>
            </div>
          </div>

          {/* Pools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPools.map((pool) => (
              <div
                key={pool.id}
                className="border-2 border-primary p-6 group hover:bg-primary/10 transition-all duration-300 flex flex-col glitch-hover"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="pixel-text">
                    <h3 className="text-xl font-bold mb-1 text-foreground">{pool.pair}</h3>
                    <p className="text-foreground/60 text-sm">{pool.fee} fee</p>
                  </div>
                  <div className="p-2 border-2 border-primary group-hover:bg-primary/20 transition">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-3 mb-6 flex-1 pixel-text">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-foreground/60">tvl</span>
                    <span className="font-bold text-foreground">{pool.tvl}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-foreground/60">apy</span>
                    <span className="font-bold text-primary">{pool.apy}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-foreground/60">24h_vol</span>
                    <span className="font-bold text-foreground">{pool.volume24h}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-foreground/60">providers</span>
                    <span className="font-bold flex items-center gap-1 text-foreground">
                      <Users className="w-4 h-4" />
                      {pool.users.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button className="w-full py-3 border-2 border-primary text-primary hover:bg-primary hover:text-black font-bold transition-all duration-300 flex items-center justify-center gap-2 group/btn pixel-text text-sm glitch-hover">
                  ADD_LIQUIDITY
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            ))}
          </div>

          {filteredPools.length === 0 && (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 pixel-text text-foreground">NO_POOLS_FOUND</h3>
              <p className="text-foreground/60 pixel-text">
                Try adjusting your search or {" "}
                <Link to="/create-pool" className="text-primary hover:text-primary/80 transition">
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
