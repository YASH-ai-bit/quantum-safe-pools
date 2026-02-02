import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Send, Download, TrendingUp, Wallet, BarChart3, DollarSign, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function Dashboard() {
  const [hideBalance, setHideBalance] = useState(false);

  const portfolioData = [
    { name: "Jan", value: 18000 },
    { name: "Feb", value: 21000 },
    { name: "Mar", value: 19500 },
    { name: "Apr", value: 23000 },
    { name: "May", value: 24856 },
  ];

  const allocationData = [
    { name: "Bitcoin (QS)", value: 45 },
    { name: "Ethereum (QS)", value: 35 },
    { name: "Stablecoins", value: 15 },
    { name: "LP Tokens", value: 5 },
  ];

  const colors = ["#00ff00", "#00ff00", "#00ff00", "#00ff00"];

  const recentTransactions = [
    { id: 1, type: "Swap", asset: "BTC → ETH", amount: "0.5 BTC", date: "Today", status: "Completed" },
    { id: 2, type: "Deposit", asset: "USDC", amount: "10,000 USDC", date: "Yesterday", status: "Completed" },
    { id: 3, type: "Liquidity", asset: "ETH-USDC Pool", amount: "2 ETH", date: "2 days ago", status: "Completed" },
    { id: 4, type: "Withdrawal", asset: "BTC", amount: "0.25 BTC", date: "3 days ago", status: "Completed" },
  ];

  const assets = [
    { symbol: "BTC", name: "Bitcoin (QS)", amount: "2.45", value: "$10,745", change: "+8.5%" },
    { symbol: "ETH", name: "Ethereum (QS)", amount: "12.8", value: "$9,216", change: "+12.3%" },
    { symbol: "USDC", name: "USD Coin", amount: "3,500", value: "$3,500", change: "0.0%" },
    { symbol: "LPT", name: "LP Tokens", amount: "5,420", value: "$1,395", change: "+15.2%" },
  ];

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
                      {hideBalance ? "****" : "$24,856.34"}
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
                  +12.5% this month
                </p>

                <div className="flex gap-4 pt-6 border-t-2 border-primary">
                  <Link to="/pools">
                    <button className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-semibold hover:bg-primary/80 transition-all pixel-text border border-primary glitch-hover">
                      <Send className="w-4 h-4" />
                      SWAP
                    </button>
                  </Link>
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
                <p className="text-3xl font-bold text-primary pixel-text">+$3,105.20</p>
              </div>
              <div className="secondary-border p-6 glitch-hover">
                <p className="text-foreground/60 text-sm mb-2 pixel-text">$ 24H_VOLUME</p>
                <p className="text-3xl font-bold text-foreground pixel-text">$562.45</p>
              </div>
              <div className="secondary-border p-6 glitch-hover">
                <p className="text-foreground/60 text-sm mb-2 pixel-text">$ POOLS_JOINED</p>
                <p className="text-3xl font-bold text-foreground pixel-text">3</p>
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
            <div className="border-2 border-primary p-6 flex flex-col justify-center glitch-hover">
              <h3 className="text-xl font-bold mb-6 pixel-text text-foreground glitch-text-hover">ASSET_ALLOCATION</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${value}%`}
                    outerRadius={80}
                    fill="#00ff00"
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#000000",
                      border: "2px solid #00ff00",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
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
                  {assets.map((asset) => (
                    <tr key={asset.symbol} className="tertiary-border border-b glitch-hover">
                      <td className="py-4 px-4">
                        <div className="pixel-text">
                          <p className="font-semibold text-foreground">{asset.name}</p>
                          <p className="text-foreground/60 text-sm">{asset.symbol}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right pixel-text text-foreground">{asset.amount}</td>
                      <td className="py-4 px-4 text-right font-semibold pixel-text text-foreground">{asset.value}</td>
                      <td className="py-4 px-4 text-right pixel-text">
                        <span className={asset.change.startsWith("+") ? "text-primary" : "text-red-500"}>
                          {asset.change}
                        </span>
                      </td>
                    </tr>
                  ))}
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
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 tertiary-border glitch-hover">
                  <div className="flex items-center gap-4">
                    <div className="p-3 border-2 border-primary">
                      {tx.type === "Swap" && <Send className="w-5 h-5 text-primary" />}
                      {tx.type === "Deposit" && <Download className="w-5 h-5 text-primary" />}
                      {tx.type === "Liquidity" && <BarChart3 className="w-5 h-5 text-primary" />}
                      {tx.type === "Withdrawal" && <Send className="w-5 h-5 text-red-500" />}
                    </div>
                    <div className="pixel-text">
                      <p className="font-semibold text-foreground">{tx.type}</p>
                      <p className="text-foreground/60 text-sm">{tx.asset}</p>
                    </div>
                  </div>
                  <div className="text-right pixel-text">
                    <p className="font-semibold text-foreground">{tx.amount}</p>
                    <p className="text-foreground/60 text-sm">{tx.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
