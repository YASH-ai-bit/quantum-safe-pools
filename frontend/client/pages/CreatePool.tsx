import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ArrowRight, Plus, Info } from "lucide-react";
import { useState } from "react";

export default function CreatePool() {
  const [step, setStep] = useState(1);
  const [tokenA, setTokenA] = useState("");
  const [tokenB, setTokenB] = useState("");
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [fee, setFee] = useState("0.30");

  const tokens = [
    { symbol: "BTC", name: "Bitcoin (QS)" },
    { symbol: "ETH", name: "Ethereum (QS)" },
    { symbol: "USDC", name: "USD Coin" },
    { symbol: "USDT", name: "Tether" },
    { symbol: "DAI", name: "Dai Stablecoin" },
  ];

  const fees = [
    { value: "0.01", label: "0.01% (Stablecoin pairs)" },
    { value: "0.05", label: "0.05% (Exotic pairs)" },
    { value: "0.25", label: "0.25% (Standard pairs)" },
    { value: "0.30", label: "0.30% (Default)" },
    { value: "1.00", label: "1.00% (High risk)" },
  ];

  const availableTokensForB = tokens.filter((t) => t.symbol !== tokenA);

  const handleCreatePool = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Pool created: ${tokenA}-${tokenB} with ${fee}% fee`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Header />

      <main className="flex-1 pt-20 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <Link to="/pools" className="text-primary hover:text-primary/80 transition mb-4 inline-flex items-center gap-2 pixel-text text-sm">
              <ArrowRight className="w-4 h-4 rotate-180" />
              back_to_pools
            </Link>
            <h1 className="text-4xl font-bold mb-2 pixel-text text-foreground">CREATE_POOL</h1>
            <p className="text-foreground/60 pixel-text">
              Set up a new quantum-safe liquidity pool and start earning yields
            </p>
          </div>

          {/* Steps */}
          <div className="flex gap-4 mb-12">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 border-2 font-bold flex items-center justify-center transition-all pixel-text ${
                    s <= step
                      ? "bg-primary text-black border-primary"
                      : "bg-black border-primary/30 text-foreground/60"
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`h-1 w-12 transition-all ${
                      s < step ? "bg-primary" : "bg-primary/30"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Form Container */}
          <form onSubmit={handleCreatePool} className="border-2 border-primary p-8 glitch-hover">
            {step === 1 && (
              <div className="space-y-6">
                <div className="pixel-text">
                  <h2 className="text-2xl font-bold mb-2 text-foreground">SELECT_TOKEN_PAIR</h2>
                  <p className="text-foreground/60">
                    Choose the two tokens for your liquidity pool
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Token A */}
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-foreground pixel-text">$ first_token</label>
                    <select
                      value={tokenA}
                      onChange={(e) => {
                        setTokenA(e.target.value);
                        if (e.target.value === tokenB) setTokenB("");
                      }}
                      className="w-full px-4 py-3 bg-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary border-2 border-primary pixel-text"
                    >
                      <option value="">$ select_token...</option>
                      {tokens.map((t) => (
                        <option key={t.symbol} value={t.symbol}>
                          {t.name} ({t.symbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Token B */}
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-foreground pixel-text">$ second_token</label>
                    <select
                      value={tokenB}
                      onChange={(e) => setTokenB(e.target.value)}
                      className="w-full px-4 py-3 bg-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary border-2 border-primary pixel-text disabled:opacity-50"
                      disabled={!tokenA}
                    >
                      <option value="">$ select_token...</option>
                      {availableTokensForB.map((t) => (
                        <option key={t.symbol} value={t.symbol}>
                          {t.name} ({t.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fee Selection */}
                <div>
                  <label className="block text-sm font-semibold mb-3 flex items-center gap-2 text-foreground pixel-text">
                    $ pool_fee
                    <div className="group relative">
                      <Info className="w-4 h-4 text-primary/60 cursor-help" />
                      <div className="hidden group-hover:block absolute z-10 bg-black border-2 border-primary p-2 rounded-none text-xs text-foreground/70 w-48 -left-24 top-6">
                        Higher fees attract better yields but may reduce trading volume
                      </div>
                    </div>
                  </label>
                  <div className="space-y-2">
                    {fees.map((f) => (
                      <label key={f.value} className="flex items-center gap-3 p-3 hover:bg-primary/10 cursor-pointer transition border border-primary/30">
                        <input
                          type="radio"
                          name="fee"
                          value={f.value}
                          checked={fee === f.value}
                          onChange={(e) => setFee(e.target.value)}
                          className="w-4 h-4"
                        />
                        <span className="text-foreground/80 pixel-text text-sm">{f.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Recommendation */}
                {tokenA && tokenB && (
                  <div className="p-4 border-2 border-primary bg-primary/5">
                    <p className="text-sm text-foreground pixel-text">
                      $ Recommended: Your selected pair {tokenA}-{tokenB} typically works well with a {fee}% fee
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!tokenA || !tokenB}
                  className="w-full py-3 border-2 border-primary text-primary font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-2 pixel-text bg-primary/0"
                >
                  CONTINUE
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="pixel-text">
                  <h2 className="text-2xl font-bold mb-2 text-foreground">SET_LIQUIDITY</h2>
                  <p className="text-foreground/60">
                    Provide equal value of both tokens to initialize the pool
                  </p>
                </div>

                <div className="p-6 border-2 border-primary bg-black mb-6">
                  <p className="text-foreground/60 text-sm mb-2 pixel-text">$ pool_preview</p>
                  <div className="flex items-center gap-4 pixel-text">
                    <div>
                      <p className="lg font-bold text-foreground">{tokenA}</p>
                      <p className="text-foreground/60 text-sm">{amountA || "0"}</p>
                    </div>
                    <Plus className="w-4 h-4 text-foreground/40" />
                    <div>
                      <p className="lg font-bold text-foreground">{tokenB}</p>
                      <p className="text-foreground/60 text-sm">{amountB || "0"}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-3 text-foreground pixel-text">
                    $ {tokenA}_amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="$ enter_amount"
                    value={amountA}
                    onChange={(e) => setAmountA(e.target.value)}
                    className="w-full px-4 py-3 bg-black text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary border-2 border-primary pixel-text"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-3 text-foreground pixel-text">
                    $ {tokenB}_amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="$ enter_amount"
                    value={amountB}
                    onChange={(e) => setAmountB(e.target.value)}
                    className="w-full px-4 py-3 bg-black text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary border-2 border-primary pixel-text"
                  />
                </div>

                <div className="p-4 border-2 border-primary bg-primary/5">
                  <p className="text-sm text-foreground/80 pixel-text">
                    You will receive LP tokens representing your share of the pool. Store these securely.
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 border-2 border-primary text-primary hover:bg-primary hover:text-black font-bold transition-all pixel-text"
                  >
                    BACK
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!amountA || !amountB}
                    className="flex-1 py-3 border-2 border-primary text-primary font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary hover:text-black transition-all pixel-text"
                  >
                    CONTINUE
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="pixel-text">
                  <h2 className="text-2xl font-bold mb-2 text-foreground">REVIEW_CONFIRM</h2>
                  <p className="text-foreground/60">
                    Review your pool configuration before creating
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 border-2 border-primary bg-black">
                    <p className="text-foreground/60 text-sm mb-2 pixel-text">$ pool_configuration</p>
                    <div className="space-y-2 pixel-text text-sm">
                      <div className="flex justify-between">
                        <span className="text-foreground/80">token_pair</span>
                        <span className="font-bold text-foreground">{tokenA}-{tokenB}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground/80">fee_tier</span>
                        <span className="font-bold text-foreground">{fee}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground/80">{tokenA}_initial</span>
                        <span className="font-bold text-foreground">{amountA}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground/80">{tokenB}_initial</span>
                        <span className="font-bold text-foreground">{amountB}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-2 border-primary bg-primary/5">
                    <p className="text-sm text-foreground pixel-text">
                      $ Note: Pool creation requires quantum-safe signature verification. Make sure you have sufficient gas fees.
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-4 border-2 border-primary bg-primary/5">
                    <input type="checkbox" className="mt-1 w-4 h-4 border-2 border-primary" />
                    <label className="text-sm text-foreground/80 pixel-text">
                      I understand that liquidity pools involve risks and I accept the terms of service
                    </label>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 py-3 border-2 border-primary text-primary hover:bg-primary hover:text-black font-bold transition-all pixel-text"
                  >
                    BACK
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 border-2 border-primary text-primary font-bold hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-2 pixel-text"
                  >
                    CREATE_POOL
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Info Section */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-2 border-primary p-6">
              <div className="w-10 h-10 border-2 border-primary flex items-center justify-center mb-4">
                <Info className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold mb-2 pixel-text text-foreground">LP_FEES</h3>
              <p className="text-foreground/60 text-sm pixel-text">
                Earn trading fees from every transaction in your pool
              </p>
            </div>
            <div className="border-2 border-primary p-6">
              <div className="w-10 h-10 border-2 border-primary flex items-center justify-center mb-4">
                <Info className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold mb-2 pixel-text text-foreground">SMART_ROUTING</h3>
              <p className="text-foreground/60 text-sm pixel-text">
                Automatic price discovery with optimal liquidity distribution
              </p>
            </div>
            <div className="border-2 border-primary p-6">
              <div className="w-10 h-10 border-2 border-primary flex items-center justify-center mb-4">
                <Info className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold mb-2 pixel-text text-foreground">QUANTUM_SAFE</h3>
              <p className="text-foreground/60 text-sm pixel-text">
                All pools are secured with post-quantum cryptography
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
