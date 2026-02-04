import { useParams, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { usePools } from "@/hooks/usePools";
import { usePoolOperations } from "@/hooks/usePoolOperations";
import { useWalletData } from "@/hooks/useWalletData";
import { useSnap } from "@/hooks/useSnap";
import { parseEther, formatEther } from "viem";

export default function PoolDetail() {
  const { poolId } = useParams<{ poolId: string }>();
  const { pools, loading: poolsLoading, refetch: refetchPools } = usePools();
  const {
    addLiquidity,
    removeLiquidity,
    swap,
    approveToken, // Added approveToken
    loading: opsLoading,
  } = usePoolOperations();
  const { refetch: refetchWallet } = useWalletData();
  const { isConnected } = useSnap();

  // Find the pool from the pools array
  const pool = pools.find((p) => p.id === poolId);

  // State for forms
  const [activeTab, setActiveTab] = useState<"add" | "remove" | "swap">("add");
  const [addAmount0, setAddAmount0] = useState("");
  const [addAmount1, setAddAmount1] = useState("");
  const [removeAmount, setRemoveAmount] = useState("");
  const [swapAmountIn, setSwapAmountIn] = useState("");
  const [swapTokenIn, setSwapTokenIn] = useState<"token0" | "token1">("token0");

  const handleSuccess = (result: any) => {
    refetchPools();
    refetchWallet();
  };

  // Show loading state
  if (poolsLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <Header />
        <main className="flex-1 pt-20 pb-20 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  // Show not found if pool doesn't exist
  if (!pool) {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <Header />
        <main className="flex-1 pt-20 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4 pixel-text text-foreground">
              POOL_NOT_FOUND
            </h1>
            <p className="text-foreground/60 mb-8">
              The requested pool does not exist.
            </p>
            <Link
              to="/pools"
              className="text-primary hover:text-primary/80 pixel-text"
            >
              &lt; back_to_pools
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleAddLiquidity = async () => {
    if (!isConnected) {
      alert("Please connect MetaMask Flask first");
      return;
    }

    try {
      const ROUTER_ADDRESS = "0xdb5cAfC811403ECe235aFeD4396082EEBB214680"; // QuantumPoolRouter

      // 1. Approve Tokens
      const amount0Wei = parseEther(addAmount0 || "0");
      const amount1Wei = parseEther(addAmount1 || "0");

      if (
        pool.poolKey.currency0 !==
          "0x0000000000000000000000000000000000000000" &&
        amount0Wei > 0n
      ) {
        await approveToken(pool.poolKey.currency0, ROUTER_ADDRESS, amount0Wei);
      }
      if (
        pool.poolKey.currency1 !==
          "0x0000000000000000000000000000000000000000" &&
        amount1Wei > 0n
      ) {
        await approveToken(pool.poolKey.currency1, ROUTER_ADDRESS, amount1Wei);
      }

      // 2. Add Liquidity
      // Calculate tick range (simplified - full range)
      const tickLower = -887220;
      const tickUpper = 887220;

      // Approximation: Use amount0 as liquidityDelta proxy for demo
      const liquidityDelta = amount0Wei;

      // Calculate ETH Value
      let ethValue = "0";
      if (
        pool.poolKey.currency0 === "0x0000000000000000000000000000000000000000"
      )
        ethValue = amount0Wei.toString();
      if (
        pool.poolKey.currency1 === "0x0000000000000000000000000000000000000000"
      )
        ethValue = amount1Wei.toString();

      const result = await addLiquidity(
        pool.poolKey,
        tickLower,
        tickUpper,
        liquidityDelta,
        ethValue,
      );

      handleSuccess(result);
      alert("Liquidity added successfully!");
      setAddAmount0("");
      setAddAmount1("");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleRemoveLiquidity = async () => {
    // ... (No approvals needed for removeLiquidity usually, unless permit is used, but for now standard)
    if (!isConnected) {
      alert("Please connect MetaMask Flask first");
      return;
    }

    try {
      const tickLower = -887220;
      const tickUpper = 887220;
      const liquidityDelta = parseEther(removeAmount || "0"); // Helper handles negation

      const result = await removeLiquidity(
        pool.poolKey,
        tickLower,
        tickUpper,
        liquidityDelta,
      );

      handleSuccess(result);
      alert("Liquidity removed successfully!");
      setRemoveAmount("");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleSwap = async () => {
    if (!isConnected) {
      alert("Please connect MetaMask Flask first");
      return;
    }

    try {
      const ROUTER_ADDRESS = "0xdb5cAfC811403ECe235aFeD4396082EEBB214680"; // QuantumPoolRouter

      const zeroForOne = swapTokenIn === "token0";
      const amountSpecified = parseEther(swapAmountIn || "0");
      const sqrtPriceLimitX96 = 0n; // No limit

      // 1. Approve Token In
      const tokenIn = zeroForOne
        ? pool.poolKey.currency0
        : pool.poolKey.currency1;

      // Only approve if not ETH
      if (
        tokenIn !== "0x0000000000000000000000000000000000000000" &&
        amountSpecified > 0n
      ) {
        await approveToken(tokenIn, ROUTER_ADDRESS, amountSpecified);
      }

      // Calculate ETH Value
      let ethValue = "0";
      if (tokenIn === "0x0000000000000000000000000000000000000000") {
        ethValue = amountSpecified.toString();
      }

      const result = await swap(
        pool.poolKey,
        zeroForOne,
        amountSpecified,
        sqrtPriceLimitX96,
        ethValue,
      );

      handleSuccess(result);
      alert("Swap executed successfully!");
      setSwapAmountIn("");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Header />

      <main className="flex-1 pt-20 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/pools"
              className="text-primary hover:text-primary/80 transition mb-4 inline-flex items-center gap-2 pixel-text text-sm"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              back_to_pools
            </Link>
            <h1 className="text-4xl font-bold mb-2 pixel-text text-foreground">
              POOL_DETAILS
            </h1>
          </div>

          {/* Pool Info Card */}
          <div className="border-2 border-primary p-6 mb-8 glitch-hover">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pixel-text">
              <div>
                <p className="text-foreground/60 text-sm mb-1">POOL_ID</p>
                <p className="text-foreground font-mono text-sm break-all">
                  {pool.id}
                </p>
              </div>
              <div>
                <p className="text-foreground/60 text-sm mb-1">FEE_TIER</p>
                <p className="text-foreground font-bold">
                  {(pool.poolKey.fee / 10000).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-foreground/60 text-sm mb-1">TVL</p>
                <p className="text-foreground font-bold text-xl">
                  ${pool.tvl || "0.00"}
                </p>
              </div>
              <div>
                <p className="text-foreground/60 text-sm mb-1">24H_VOLUME</p>
                <p className="text-foreground font-bold text-xl">
                  ${pool.volume24h || "0.00"}
                </p>
              </div>
              <div>
                <p className="text-foreground/60 text-sm mb-1">24H_FEES</p>
                <p className="text-primary font-bold text-xl">
                  ${pool.fees24h || "0.00"}
                </p>
              </div>
              <div>
                <p className="text-foreground/60 text-sm mb-1">APY</p>
                <p className="text-primary font-bold text-xl">
                  {pool.apy || "0.00"}%
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b-2 border-primary">
            {(["overview", "add", "remove", "swap"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 border-b-2 transition pixel-text font-bold ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-foreground/60 hover:text-foreground"
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="border-2 border-primary p-8 glitch-hover">
            {activeTab === "overview" && (
              <div className="space-y-6 pixel-text">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  POOL_METRICS
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 border border-primary/50">
                    <p className="text-foreground/60 text-sm mb-2">
                      CURRENT_PRICE
                    </p>
                    <p className="text-foreground font-bold text-xl">1.0</p>
                    <p className="text-primary text-sm mt-1">+0.5% (24h)</p>
                  </div>
                  <div className="p-4 border border-primary/50">
                    <p className="text-foreground/60 text-sm mb-2">LIQUIDITY</p>
                    <p className="text-foreground font-bold text-xl">
                      {formatEther(pool.liquidity)}
                    </p>
                  </div>
                  <div className="p-4 border border-primary/50">
                    <p className="text-foreground/60 text-sm mb-2">
                      TOTAL_FEES_COLLECTED
                    </p>
                    <p className="text-primary font-bold text-xl">
                      ${pool.fees24h || "0.00"}
                    </p>
                  </div>
                  <div className="p-4 border border-primary/50">
                    <p className="text-foreground/60 text-sm mb-2">
                      IMPERMANENT_LOSS
                    </p>
                    <p className="text-foreground font-bold text-xl">0.00%</p>
                    <p className="text-foreground/60 text-xs mt-1">
                      Current vs Initial
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "add" && (
              <div className="space-y-6 pixel-text">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  ADD_LIQUIDITY
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-foreground">
                      TOKEN_0_AMOUNT
                    </label>
                    <input
                      type="number"
                      value={addAmount0}
                      onChange={(e) => setAddAmount0(e.target.value)}
                      className="w-full px-4 py-3 bg-black text-foreground border-2 border-primary pixel-text"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-foreground">
                      TOKEN_1_AMOUNT
                    </label>
                    <input
                      type="number"
                      value={addAmount1}
                      onChange={(e) => setAddAmount1(e.target.value)}
                      className="w-full px-4 py-3 bg-black text-foreground border-2 border-primary pixel-text"
                      placeholder="0.0"
                    />
                  </div>
                  <button
                    onClick={handleAddLiquidity}
                    disabled={opsLoading || !isConnected}
                    className="w-full py-3 border-2 border-primary text-primary hover:bg-primary hover:text-black font-bold transition-all pixel-text disabled:opacity-50"
                  >
                    {opsLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                        ADDING...
                      </>
                    ) : (
                      "ADD_LIQUIDITY"
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "remove" && (
              <div className="space-y-6 pixel-text">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  REMOVE_LIQUIDITY
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-foreground">
                      LP_TOKEN_AMOUNT
                    </label>
                    <input
                      type="number"
                      value={removeAmount}
                      onChange={(e) => setRemoveAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-black text-foreground border-2 border-primary pixel-text"
                      placeholder="0.0"
                    />
                  </div>
                  <button
                    onClick={handleRemoveLiquidity}
                    disabled={opsLoading || !isConnected}
                    className="w-full py-3 border-2 border-primary text-primary hover:bg-primary hover:text-black font-bold transition-all pixel-text disabled:opacity-50"
                  >
                    {opsLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                        REMOVING...
                      </>
                    ) : (
                      "REMOVE_LIQUIDITY"
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "swap" && (
              <div className="space-y-6 pixel-text">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  SWAP_TOKENS
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-foreground">
                      TOKEN_IN
                    </label>
                    <select
                      value={swapTokenIn}
                      onChange={(e) =>
                        setSwapTokenIn(e.target.value as "token0" | "token1")
                      }
                      className="w-full px-4 py-3 bg-black text-foreground border-2 border-primary pixel-text"
                    >
                      <option value="token0">Token 0</option>
                      <option value="token1">Token 1</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-foreground">
                      AMOUNT_IN
                    </label>
                    <input
                      type="number"
                      value={swapAmountIn}
                      onChange={(e) => setSwapAmountIn(e.target.value)}
                      className="w-full px-4 py-3 bg-black text-foreground border-2 border-primary pixel-text"
                      placeholder="0.0"
                    />
                  </div>
                  <button
                    onClick={handleSwap}
                    disabled={opsLoading || !isConnected}
                    className="w-full py-3 border-2 border-primary text-primary hover:bg-primary hover:text-black font-bold transition-all pixel-text disabled:opacity-50"
                  >
                    {opsLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                        SWAPPING...
                      </>
                    ) : (
                      "EXECUTE_SWAP"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
