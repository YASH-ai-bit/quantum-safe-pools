import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ArrowRight, Plus, Info, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { usePoolOperations } from "@/hooks/usePoolOperations";
import { useSnap } from "@/hooks/useSnap";
import { ethers } from "ethers";

// Common token addresses on Sepolia
const TOKEN_ADDRESSES: Record<string, string> = {
  'ETH': '0x0000000000000000000000000000000000000000',
  'WETH': '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // Sepolia WETH
  'USDC': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
  'USDT': '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', // Sepolia USDT
  'DAI': '0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6', // Sepolia DAI
};

export default function CreatePool() {
  const [step, setStep] = useState(1);
  const [tokenA, setTokenA] = useState("");
  const [tokenB, setTokenB] = useState("");
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [fee, setFee] = useState("0.30");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { createPool, loading } = usePoolOperations();
  const { isConnected } = useSnap();

  const tokens = [
    { symbol: "ETH", name: "Ethereum", address: TOKEN_ADDRESSES.ETH },
    { symbol: "WETH", name: "Wrapped Ethereum", address: TOKEN_ADDRESSES.WETH },
    { symbol: "USDC", name: "USD Coin", address: TOKEN_ADDRESSES.USDC },
    { symbol: "USDT", name: "Tether", address: TOKEN_ADDRESSES.USDT },
    { symbol: "DAI", name: "Dai Stablecoin", address: TOKEN_ADDRESSES.DAI },
  ];

  const fees = [
    { value: "0.01", label: "0.01% (Stablecoin pairs)" },
    { value: "0.05", label: "0.05% (Exotic pairs)" },
    { value: "0.25", label: "0.25% (Standard pairs)" },
    { value: "0.30", label: "0.30% (Default)" },
    { value: "1.00", label: "1.00% (High risk)" },
  ];

  const availableTokensForB = tokens.filter((t) => t.symbol !== tokenA);

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setError('Please connect MetaMask Flask first');
      return;
    }

    setError(null);
    setTxHash(null);

    try {
      const tokenAObj = tokens.find(t => t.symbol === tokenA);
      const tokenBObj = tokens.find(t => t.symbol === tokenB);
      
      if (!tokenAObj || !tokenBObj) {
        throw new Error('Invalid token selection');
      }

      // Calculate initial price (simplified - would use actual price oracle)
      // For now, use 1:1 ratio
      const initialPrice = ethers.parseEther('1'); // sqrtPriceX96 format would need conversion
      
      // Fee in basis points (0.30% = 3000)
      const feeBps = Math.round(parseFloat(fee) * 100);
      const tickSpacing = 60; // Standard tick spacing

      const receipt = await createPool(
        tokenAObj.address,
        tokenBObj.address,
        feeBps,
        tickSpacing,
        initialPrice
      );

      setTxHash(receipt.hash);
      setStep(4); // Success step
    } catch (err: any) {
      setError(err.message || 'Failed to create pool');
      setStep(5); // Error step
    }
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

                {error && (
                  <div className="p-4 border-2 border-red-500 bg-red-500/10">
                    <div className="flex items-center gap-2 text-red-500 pixel-text">
                      <AlertCircle className="w-5 h-5" />
                      <p>{error}</p>
                    </div>
                  </div>
                )}

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
                        <span className="font-bold text-foreground">{amountA || '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground/80">{tokenB}_initial</span>
                        <span className="font-bold text-foreground">{amountB || '0'}</span>
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
                    disabled={loading}
                    className="flex-1 py-3 border-2 border-primary text-primary hover:bg-primary hover:text-black font-bold transition-all pixel-text disabled:opacity-50"
                  >
                    BACK
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !isConnected}
                    className="flex-1 py-3 border-2 border-primary text-primary font-bold hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-2 pixel-text disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        CREATING...
                      </>
                    ) : (
                      <>
                        CREATE_POOL
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Success Step */}
            {step === 4 && txHash && (
              <div className="space-y-6">
                <div className="pixel-text text-center">
                  <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2 text-foreground">POOL_CREATED_SUCCESSFULLY</h2>
                  <p className="text-foreground/60 mb-4">
                    Your pool has been created on-chain
                  </p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 transition pixel-text text-sm"
                  >
                    View on Etherscan: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </a>
                </div>
                <Link to="/pools">
                  <button className="w-full py-3 border-2 border-primary text-primary hover:bg-primary hover:text-black font-bold transition-all pixel-text">
                    VIEW_POOLS
                  </button>
                </Link>
              </div>
            )}

            {/* Error Step */}
            {step === 5 && error && (
              <div className="space-y-6">
                <div className="pixel-text text-center">
                  <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2 text-foreground">POOL_CREATION_FAILED</h2>
                  <p className="text-foreground/60 mb-4">{error}</p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setStep(3);
                      setError(null);
                    }}
                    className="flex-1 py-3 border-2 border-primary text-primary hover:bg-primary hover:text-black font-bold transition-all pixel-text"
                  >
                    TRY_AGAIN
                  </button>
                  <Link to="/pools" className="flex-1">
                    <button className="w-full py-3 border-2 border-primary/50 text-primary/50 font-bold transition-all pixel-text">
                      BACK_TO_POOLS
                    </button>
                  </Link>
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
