import { Link } from "react-router-dom";
import { ArrowRight, Shield, Zap, TrendingUp, Lock, BarChart3, Users, Loader2, Copy } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useWalletData } from "@/hooks/useWalletData";
import { usePools } from "@/hooks/usePools";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { useSnap } from "@/hooks/useSnap";

export default function Index() {
  const { totalBalance, tokenBalances, loading: walletLoading } = useWalletData();
  const { pools, loading: poolsLoading } = usePools();
  const { stats, loading: statsLoading } = usePlatformStats();
  const { accountAddress, isConnected } = useSnap();

  // Get top 2 pools by TVL
  const topPools = pools
    .sort((a, b) => parseFloat(b.tvl || '0') - parseFloat(a.tvl || '0'))
    .slice(0, 2);

  // Get primary token balances for display
  const ethBalance = tokenBalances.find(t => t.symbol === 'ETH');

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div className="space-y-8">
              <div>
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6 pixel-text text-foreground">
                  <span className="text-primary">QUANTUM</span>
                  <br />
                  SAFE WALLET
                </h1>
                <p className="text-lg text-foreground/80 leading-relaxed pixel-text">
                  Secure your digital assets with quantum-resistant cryptography. Trade, pool, and manage your tokens with enterprise-grade security.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/dashboard">
                  <button className="w-full sm:w-auto px-8 py-4 border-2 border-primary text-primary font-bold text-lg hover:bg-primary hover:text-black transition-all duration-300 flex items-center justify-center gap-2 group pixel-text glitch-hover">
                    [ GET_STARTED ]
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <button className="w-full sm:w-auto px-8 py-4 secondary-border text-primary font-bold text-lg hover:border-primary transition-all duration-300 pixel-text glitch-hover">
                  [ LEARN_MORE ]
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-8 space-y-4">
                <div className="flex items-center gap-3 text-foreground/80 pixel-text">
                  <Shield className="w-5 h-5 text-primary" />
                  <span>$ nist-approved quantum-safe algorithms</span>
                </div>
                <div className="flex items-center gap-3 text-foreground/80 pixel-text">
                  <Lock className="w-5 h-5 text-primary" />
                  <span>$ 256-bit encryption with post-quantum security</span>
                </div>
                <div className="flex items-center gap-3 text-foreground/80 pixel-text">
                  <Users className="w-5 h-5 text-primary" />
                  <span>$ decentralized liquidity pools</span>
                </div>
              </div>
            </div>

            {/* Right Column - Terminal Card */}
            <div className="relative h-96 lg:h-full">
              <div className="relative border-2 border-primary p-8 h-full flex flex-col justify-between bg-black overflow-hidden">
                {/* Terminal header */}
                <div className="absolute top-0 left-0 right-0 h-8 bg-primary border-b-2 border-primary flex items-center px-4 gap-2">
                  <div className="w-2 h-2 bg-black rounded-full"></div>
                  <div className="w-2 h-2 bg-black rounded-full"></div>
                  <div className="w-2 h-2 bg-black rounded-full"></div>
                  <span className="text-black font-bold text-xs pixel-text ml-2">wallet.exe</span>
                </div>

                <div className="relative z-10 pt-8 space-y-6">
                  {/* Show Quantum Account Address */}
                  {isConnected && accountAddress && (
                    <div className="space-y-1 pixel-text text-primary">
                      <p className="text-xs text-foreground/60">{'> quantum_account:'}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-primary break-all">
                          {accountAddress.slice(0, 10)}...{accountAddress.slice(-8)}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(accountAddress);
                            alert('Address copied! Send funds here to use pools.');
                          }}
                          className="text-primary hover:text-primary/80"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[10px] text-foreground/40">Send tokens here to use pools</p>
                    </div>
                  )}

                  <div className="space-y-2 pixel-text text-primary">
                    <p className="text-sm">{'> Balance:'}</p>
                    {walletLoading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    ) : (
                      <p className="text-3xl font-bold text-foreground">
                        ${totalBalance || '0.00'}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 pixel-text text-sm">
                    <div className="flex justify-between items-center text-foreground/80">
                      <span>{'> eth_sep:'}</span>
                      <span className="text-primary">{ethBalance ? `${ethBalance.amount} ETH` : '0.00 ETH'}</span>
                    </div>
                    <div className="flex justify-between items-center text-foreground/80">
                      <span>{'> usdc:'}</span>
                      <span className="text-primary">
                        {tokenBalances.find(t => t.symbol === 'USDC')
                          ? `${tokenBalances.find(t => t.symbol === 'USDC')?.amount} USDC`
                          : '0.00 USDC'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-foreground/80">
                      <span>{'> pyusd:'}</span>
                      <span className="text-primary">
                        {tokenBalances.find(t => t.symbol === 'PYUSD')
                          ? `${tokenBalances.find(t => t.symbol === 'PYUSD')?.amount} PYUSD`
                          : '0.00 PYUSD'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-foreground/80">
                      <span>{'> link:'}</span>
                      <span className="text-primary">
                        {tokenBalances.find(t => t.symbol === 'LINK')
                          ? `${tokenBalances.find(t => t.symbol === 'LINK')?.amount} LINK`
                          : '0.00 LINK'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-foreground/80">
                      <span>{'> lp_tokens:'}</span>
                      <span className="text-primary">
                        {tokenBalances.filter(t => t.isLP).length > 0
                          ? `${tokenBalances.filter(t => t.isLP).length} positions`
                          : '0 positions'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t-2 border-primary">
                    <div className="flex items-center gap-2 pixel-text text-primary text-sm">
                      <TrendingUp className="w-5 h-5" />
                      <span>+0.0% this month</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black border-t-2 border-b-2 border-primary/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4 pixel-text text-foreground">
              QUANTUM_SAFE_FEATURES
            </h2>
            <p className="text-lg text-foreground/70 max-w-2xl mx-auto pixel-text">
              Advanced security meets intuitive design for the modern crypto investor
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="border-2 border-primary p-8 group hover:bg-primary/10 transition-all duration-300 glitch-hover">
              <div className="mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-bold pixel-text text-foreground glitch-text-hover">POST_QUANTUM</h3>
              </div>
              <p className="text-foreground/70 pixel-text text-sm">
                Protected against future quantum computing threats with NIST-approved cryptographic algorithms.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="border-2 border-primary p-8 group hover:bg-primary/10 transition-all duration-300 glitch-hover">
              <div className="mb-4 flex items-center gap-2">
                <Zap className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-bold pixel-text text-foreground glitch-text-hover">HIGH_SPEED</h3>
              </div>
              <p className="text-foreground/70 pixel-text text-sm">
                Execute swaps and liquidity operations with minimal latency and competitive fees.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="border-2 border-primary p-8 group hover:bg-primary/10 transition-all duration-300 glitch-hover">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-bold pixel-text text-foreground glitch-text-hover">ANALYTICS</h3>
              </div>
              <p className="text-foreground/70 pixel-text text-sm">
                Track your liquidity pools with detailed analytics and real-time performance metrics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Liquidity Pools Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4 pixel-text text-foreground">
              LIQUIDITY_POOLS
            </h2>
            <p className="text-lg text-foreground/70 max-w-2xl mx-auto pixel-text">
              Create and manage quantum-safe liquidity pools with optimal yield opportunities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Popular Pools */}
            {poolsLoading ? (
              <div className="col-span-2 text-center py-12">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                <p className="text-foreground/60 pixel-text">Loading pools...</p>
              </div>
            ) : topPools.length > 0 ? (
              topPools.map((pool) => {
                const pair = `${pool.token0Symbol || 'TOKEN0'}-${pool.token1Symbol || 'TOKEN1'}`;
                return (
                  <div key={pool.id} className="border-2 border-primary p-6 group hover:bg-primary/10 transition-all duration-300 glitch-hover">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-xl font-bold pixel-text text-foreground mb-1">{pair}</h4>
                        <p className="text-foreground/60 pixel-text text-sm">pool_pair</p>
                      </div>
                      <div className="w-12 h-12 border-2 border-primary flex items-center justify-center bg-primary/20">
                        <TrendingUp className="w-6 h-6 text-primary" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-primary">
                      <div className="pixel-text">
                        <p className="text-foreground/60 text-sm mb-1">tvl</p>
                        <p className="font-bold text-lg text-foreground">${pool.tvl || '0.00'}</p>
                      </div>
                      <div className="pixel-text">
                        <p className="text-foreground/60 text-sm mb-1">apy</p>
                        <p className="font-bold text-lg text-primary">{pool.apy || '0.00'}%</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 text-center py-12">
                <p className="text-foreground/60 pixel-text">No pools available yet</p>
              </div>
            )}
          </div>

          <div className="text-center">
            <Link to="/pools">
              <button className="px-8 py-4 border-2 border-primary text-primary font-bold text-lg hover:bg-primary hover:text-black transition-all duration-300 inline-flex items-center gap-2 group pixel-text glitch-hover">
                EXPLORE_ALL_POOLS
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black border-t-2 border-primary/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center secondary-border p-8 glitch-hover">
              {statsLoading ? (
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-2" />
              ) : (
                <p className="text-4xl lg:text-5xl font-bold pixel-text text-primary mb-2 glitch-text-hover">
                  {stats.totalTVL || '$0'}
                </p>
              )}
              <p className="text-foreground/70 pixel-text">tvl_locked</p>
            </div>
            <div className="text-center secondary-border p-8 glitch-hover">
              {statsLoading ? (
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-2" />
              ) : (
                <p className="text-4xl lg:text-5xl font-bold pixel-text text-primary mb-2 glitch-text-hover">
                  {stats.avgAPY || '5%'}
                </p>
              )}
              <p className="text-foreground/70 pixel-text">avg_apy</p>
            </div>
            <div className="text-center secondary-border p-8 glitch-hover">
              {statsLoading ? (
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-2" />
              ) : (
                <p className="text-4xl lg:text-5xl font-bold pixel-text text-primary mb-2 glitch-text-hover">
                  {stats.liquidityPools || '0'}
                </p>
              )}
              <p className="text-foreground/70 pixel-text">liquidity_pools</p>
            </div>
            <div className="text-center secondary-border p-8 glitch-hover">
              <p className="text-4xl lg:text-5xl font-bold pixel-text text-primary mb-2 glitch-text-hover">
                {stats.uptime || '99.99%'}
              </p>
              <p className="text-foreground/70 pixel-text">uptime_sla</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto border-2 border-primary p-12 text-center glitch-hover">
          <h2 className="text-4xl font-bold mb-4 pixel-text text-foreground glitch-text-hover">READY_TO_TRADE?</h2>
          <p className="text-lg text-foreground/70 mb-8 pixel-text">
            Create your quantum-safe wallet today and join thousands of secure traders.
          </p>
          <Link to="/dashboard">
            <button className="px-10 py-4 border-2 border-primary text-primary font-bold text-lg hover:bg-primary hover:text-black transition-all duration-300 inline-flex items-center gap-2 group pixel-text glitch-hover">
              LAUNCH_DASHBOARD
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
