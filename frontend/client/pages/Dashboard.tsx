import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Send, Download, TrendingUp, Wallet, BarChart3, DollarSign, Eye, EyeOff, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useWalletData } from "@/hooks/useWalletData";
import { usePools } from "@/hooks/usePools";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { usePublicClient } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import SwapModal from "@/components/SwapModal.tsx";

export default function Dashboard() {
  const [hideBalance, setHideBalance] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const { totalBalance, portfolioChange, lpPositions, tokenBalances, loading: walletLoading } = useWalletData();
  const { pools, loading: poolsLoading } = usePools();
  const { getRecentTransactions, formatTime, getTypeLabel } = useTransactionHistory();

  // Calculate total liquidity provided from LP positions (exclude dark pools)
  const totalLiquidityProvided = lpPositions
    .filter(pos => {
      const value = parseFloat(pos.value || '0');
      return !isNaN(value) && value > 0;
    })
    .reduce((sum, pos) => sum + parseFloat(pos.value), 0)
    .toFixed(2);

  // Get recent transactions from localStorage
  const recentTransactions = getRecentTransactions(10);

  // Generate portfolio chart data (simplified - would need historical data)
  const portfolioData = [
    { name: "Jan", value: 0 },
    { name: "Feb", value: 0 },
    { name: "Mar", value: 0 },
    { name: "Apr", value: 0 },
    { name: "May", value: parseFloat(totalBalance) || 0 },
  ];

  // Calculate asset allocation from token balances (exclude dark pool LPs with NaN values)
  const totalValue = parseFloat(totalBalance) || 0;
  const validTokenBalances = tokenBalances.filter(token => {
    const value = parseFloat(token.value.replace('$', '').replace(',', ''));
    return !isNaN(value) && value >= 0;
  });

  const allocationData = validTokenBalances.length > 0
    ? validTokenBalances.map(token => {
      const tokenValue = parseFloat(token.value.replace('$', '').replace(',', ''));
      return {
        name: token.name,
        value: totalValue > 0 ? Math.round((tokenValue / totalValue) * 100) : 0,
      };
    })
    : [{ name: "No Assets", value: 100 }];

  // Distinct colors for chart slices
  const COLORS = ["#00ff00", "#bf00ff", "#3b82f6", "#eab308", "#f43f5e"];

  // Assets from token balances
  const assets = tokenBalances.map((token, index) => ({
    symbol: token.symbol,
    name: token.name,
    amount: token.amount,
    value: token.value,
    change: "0.0%", // Would need price history
  }));

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Header />

      <main className="flex-1 pt-20 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 pixel-text text-foreground">DASHBOARD</h1>
            <p className="text-foreground/60 pixel-text">Welcome back! Here is your wallet overview.</p>
          </div>

          {/* Top Balance Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 border-2 border-primary p-8 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div className="pixel-text">
                    <p className="text-foreground/60 text-sm font-semibold mb-2">$ TOTAL_BALANCE</p>
                    <h2 className="text-5xl font-bold text-foreground">
                      {walletLoading ? (
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                      ) : (
                        hideBalance ? "****" : `$${totalBalance || '0.00'}`
                      )}
                    </h2>
                  </div>
                  <button
                    onClick={() => setHideBalance(!hideBalance)}
                    className="p-3 hover:bg-primary/20 transition text-foreground/60 hover:text-primary border border-primary/30"
                  >
                    {hideBalance ? <EyeOff /> : <Eye />}
                  </button>
                </div>

                <p className="text-primary font-semibold mb-8 flex items-center gap-2 pixel-text">
                  <TrendingUp className="w-4 h-4" />
                  {parseFloat(portfolioChange) >= 0 ? '+' : ''}{portfolioChange || '0.00'}% this month
                </p>

                <div className="flex gap-4 pt-6 border-t-2 border-primary">
                  <button
                    onClick={() => setIsSwapModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-semibold hover:bg-primary/80 transition-all pixel-text border border-primary glitch-hover"
                  >
                    <Send className="w-4 h-4" />
                    SWAP
                  </button>
                  <button className="flex items-center gap-2 px-6 py-3 border-2 border-primary text-primary hover:bg-primary/10 font-semibold transition-all pixel-text glitch-hover">
                    <Download className="w-4 h-4" />
                    DEPOSIT
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              <div className="secondary-border p-6 glitch-hover">
                <p className="text-foreground/60 text-sm mb-2 pixel-text">$ PORTFOLIO_CHANGE</p>
                {walletLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                ) : (
                  <p className="text-3xl font-bold text-primary pixel-text">
                    {parseFloat(portfolioChange) >= 0 ? '+' : ''}${portfolioChange || '0.00'}
                  </p>
                )}
              </div>
              <div className="secondary-border p-6 glitch-hover">
                <p className="text-foreground/60 text-sm mb-2 pixel-text">$ LIQUIDITY_PROVIDED</p>
                {walletLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                ) : (
                  <div className="flex items-center gap-2 group/liquidity relative">
                    <p className="text-3xl font-bold text-foreground pixel-text">${totalLiquidityProvided}</p>
                    <div className="relative">
                      <Plus className="w-5 h-5 text-primary cursor-help" />
                      <div className="absolute left-0 bottom-full mb-2 w-56 p-2 bg-primary text-black text-xs font-bold rounded opacity-0 group-hover/liquidity:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg border-2 border-primary-foreground">
                        + Additional liquidity in Dark Pools (private)
                        <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-primary"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Portfolio Chart */}
            <div className="lg:col-span-2 border-2 border-primary p-6 glitch-hover">
              <h3 className="text-xl font-bold mb-6 pixel-text text-foreground glitch-text-hover">PORTFOLIO_GROWTH</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={portfolioData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#00ff0030" />
                  <XAxis stroke="#00ff0050" />
                  <YAxis stroke="#00ff0050" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#000000",
                      border: "2px solid #00ff00",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#00ff00"
                    strokeWidth={3}
                    dot={{ fill: "#00ff00", r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Asset Allocation */}
            <div className="border-2 border-primary p-6 glitch-hover flex flex-col">
              <h3 className="text-xl font-bold mb-6 pixel-text text-foreground glitch-text-hover">ASSET_ALLOCATION</h3>
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 flex-1">
                {/* Chart */}
                <div className="w-full md:w-1/2 h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {allocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#000000",
                          border: "2px solid #00ff00",
                          borderRadius: "4px",
                          color: "#fff"
                        }}
                        itemStyle={{ color: "#fff" }}
                        formatter={(value: number) => [`${value}%`, 'Allocation']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="w-full md:w-1/2 space-y-4">
                  {allocationData.map((entry, index) => (
                    <div key={`legend-${index}`} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length], boxShadow: `0 0 10px ${COLORS[index % COLORS.length]}` }}
                        />
                        <span className="text-foreground font-medium pixel-text text-sm group-hover:text-primary transition-colors">
                          {entry.name}
                        </span>
                      </div>
                      <span className="text-foreground/60 font-mono text-sm group-hover:text-foreground transition-colors">
                        {entry.value}%
                      </span>
                    </div>
                  ))}
                  {allocationData.length === 0 && (
                    <div className="text-center text-foreground/40 pixel-text text-sm py-4">
                      No assets to display
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Assets Table */}
          <div className="border-2 border-primary p-6 mb-8 glitch-hover">
            <h3 className="text-xl font-bold mb-6 pixel-text text-foreground glitch-text-hover">YOUR_ASSETS</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-primary">
                    <th className="text-left py-4 px-4 font-semibold text-foreground/60 pixel-text text-sm">ASSET</th>
                    <th className="text-right py-4 px-4 font-semibold text-foreground/60 pixel-text text-sm">AMOUNT</th>
                    <th className="text-right py-4 px-4 font-semibold text-foreground/60 pixel-text text-sm">VALUE</th>
                    <th className="text-right py-4 px-4 font-semibold text-foreground/60 pixel-text text-sm">CHANGE</th>
                  </tr>
                </thead>
                <tbody>
                  {walletLoading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                      </td>
                    </tr>
                  ) : assets.length > 0 ? (
                    assets.map((asset) => (
                      <tr key={asset.symbol} className="tertiary-border border-b glitch-hover">
                        <td className="py-4 px-4">
                          <div className="pixel-text">
                            <p className="font-semibold text-foreground">{asset.name}</p>
                            <p className="text-foreground/60 text-sm">{asset.symbol}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right pixel-text text-foreground">{asset.amount || '0.00'}</td>
                        <td className="py-4 px-4 text-right font-semibold pixel-text text-foreground">{asset.value || '$0.00'}</td>
                        <td className="py-4 px-4 text-right pixel-text">
                          <span className={asset.change.startsWith("+") ? "text-primary" : asset.change === "0.0%" ? "text-foreground/60" : "text-red-500"}>
                            {asset.change || '0.0%'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-foreground/60 pixel-text">
                        No assets found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="border-2 border-primary p-6 glitch-hover">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold pixel-text text-foreground glitch-text-hover">RECENT_TRANSACTIONS</h3>
              <a href="#" className="text-primary hover:text-primary/80 transition pixel-text text-sm">
                view_all
              </a>
            </div>
            <div className="space-y-4">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 tertiary-border glitch-hover">
                    <div className="flex items-center gap-4">
                      <div className="p-3 border-2 border-primary">
                        {tx.type === "swap" && <Send className="w-5 h-5 text-primary" />}
                        {tx.type === "add_liquidity" && <Download className="w-5 h-5 text-primary" />}
                        {tx.type === "remove_liquidity" && <BarChart3 className="w-5 h-5 text-red-500" />}
                        {tx.type === "approve" && <DollarSign className="w-5 h-5 text-primary" />}
                        {tx.type === "create_pool" && <BarChart3 className="w-5 h-5 text-primary" />}
                      </div>
                      <div className="pixel-text">
                        <p className="font-semibold text-foreground">{getTypeLabel(tx.type)}</p>
                        <p className="text-foreground/60 text-sm">
                          {tx.details.fromToken && tx.details.toToken
                            ? (tx.type === "add_liquidity" || tx.type === "remove_liquidity"
                              ? `${tx.details.fromToken} + ${tx.details.toToken}`
                              : `${tx.details.fromToken} → ${tx.details.toToken}`)
                            : tx.details.fromToken || "Transaction"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right pixel-text">
                      <p className="font-semibold text-foreground">
                        {tx.type === "add_liquidity" && tx.details.toAmount ? (
                          <span className="text-xs">
                            {tx.details.fromAmount} {tx.details.fromToken} + {tx.details.toAmount} {tx.details.toToken}
                          </span>
                        ) : (
                          tx.details.fromAmount ? `${tx.details.fromAmount} ${tx.details.fromToken || ""}` : "—"
                        )}
                      </p>
                      <p className="text-foreground/60 text-sm">{formatTime(tx.timestamp)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-foreground/60 pixel-text">
                  No recent transactions
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Swap Modal */}
      <SwapModal isOpen={isSwapModalOpen} onClose={() => setIsSwapModalOpen(false)} />

      <Footer />
    </div>
  );
}
