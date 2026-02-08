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
  Wallet,
  AlertCircle,
  Lock,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { usePools } from "@/hooks/usePools";
import { useBatchedPoolOperations } from "@/hooks/useBatchedPoolOperations";
import { useWalletData } from "@/hooks/useWalletData";
import { useSnap } from "@/hooks/useSnap";
import { useTransactionHistory, TransactionType } from "@/hooks/useTransactionHistory";
import { useLPMetrics } from "@/hooks/useLPMetrics";
import { useQuantumRegistry } from "@/hooks/useQuantumRegistry";
import { parseUnits, formatUnits, formatEther } from "viem";
import { CONTRACTS } from "@shared/contracts";
import TransactionSuccessModal from "@/components/TransactionSuccessModal";

// Token decimals mapping (common tokens)
const TOKEN_DECIMALS: Record<string, number> = {
  ETH: 18,
  WETH: 18,
  USDC: 6,
  USDT: 6,
  DAI: 18,
  PYUSD: 6,
  LINK: 18,
};

// Get decimals for a token symbol
const getTokenDecimals = (symbol: string | undefined): number => {
  if (!symbol) return 18;
  return TOKEN_DECIMALS[symbol.toUpperCase()] ?? 18;
};

export default function PoolDetail() {
  const { poolId } = useParams<{ poolId: string }>();
  const { pools, loading: poolsLoading, refetch: refetchPools } = usePools();
  const {
    addLiquidityBatched,
    removeLiquidityBatched,
    swapBatched,
    loading: opsLoading,
    isConnected: isBatchConnected,
  } = useBatchedPoolOperations();
  const { refetch: refetchWallet, tokenBalances, lpPositions } = useWalletData();
  const { isConnected, accountAddress } = useSnap();
  const { addTransaction } = useTransactionHistory();
  const { checkQuantumSafe } = useQuantumRegistry();

  // Check QS status for fee display
  const [isQuantumSafe, setIsQuantumSafe] = useState<boolean>(false);

  // Check QS status when account changes
  useEffect(() => {
    const checkStatus = async () => {
      if (accountAddress) {
        try {
          const isQS = await checkQuantumSafe(accountAddress);
          setIsQuantumSafe(isQS);
        } catch (error) {
          console.error("Error checking QS status:", error);
          setIsQuantumSafe(false);
        }
      }
    };
    checkStatus();
  }, [accountAddress, checkQuantumSafe]);

  // Find the pool from the pools array
  const pool = pools.find((p) => p.id === poolId);

  // Get user's LP balance for this pool (Memoized early for hooks)
  const userLpPosition = useMemo(() => {
    if (!pool || !lpPositions) return null;
    return lpPositions.find((lp) => lp.poolId.toLowerCase() === pool.id.toLowerCase());
  }, [pool, lpPositions]);

  const userLpBalance = useMemo(() => {
    if (!userLpPosition) return 0n;
    return userLpPosition.balance;
  }, [userLpPosition]);

  const metrics = useLPMetrics(pool, userLpBalance);

  // State for forms
  const [activeTab, setActiveTab] = useState<"add" | "remove" | "swap" | "overview">("add");
  const [addAmount0, setAddAmount0] = useState("");
  const [addAmount1, setAddAmount1] = useState("");
  const [removeAmount, setRemoveAmount] = useState("");
  const [swapAmountIn, setSwapAmountIn] = useState("");
  const [swapTokenIn, setSwapTokenIn] = useState<"token0" | "token1">("token0");
  const [error, setError] = useState<string | null>(null);

  // Success modal state
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    type: TransactionType;
    txHash: string;
    details: any;
  }>({ isOpen: false, type: "swap", txHash: "", details: {} });

  const closeSuccessModal = () => setSuccessModal((prev) => ({ ...prev, isOpen: false }));

  // Helper to get token balance from wallet data
  const getTokenBalance = (symbol: string): number => {
    const token = tokenBalances.find((t) => t.symbol === symbol);
    if (!token) return 0;
    return parseFloat(token.amount) || 0;
  };

  // Validate balances for add liquidity
  const addLiquidityValidation = useMemo(() => {
    if (!pool || !addAmount0 || !addAmount1) {
      return { isValid: true, errors: [] };
    }

    const errors: string[] = [];
    const balance0 = getTokenBalance(pool.token0Symbol || "");
    const balance1 = getTokenBalance(pool.token1Symbol || "");
    const required0 = parseFloat(addAmount0) || 0;
    const required1 = parseFloat(addAmount1) || 0;

    if (required0 > 0 && balance0 < required0) {
      errors.push(`Insufficient ${pool.token0Symbol} balance. You have ${balance0.toFixed(4)} but need ${required0}`);
    }
    if (required1 > 0 && balance1 < required1) {
      errors.push(`Insufficient ${pool.token1Symbol} balance. You have ${balance1.toFixed(4)} but need ${required1}`);
    }

    return { isValid: errors.length === 0, errors };
  }, [pool, addAmount0, addAmount1, tokenBalances]);

  // Validate balances for swap
  const swapValidation = useMemo(() => {
    if (!pool || !swapAmountIn) {
      return { isValid: true, errors: [] };
    }

    const errors: string[] = [];
    const tokenSymbol = swapTokenIn === "token0" ? pool.token0Symbol : pool.token1Symbol;
    const balance = getTokenBalance(tokenSymbol || "");
    const required = parseFloat(swapAmountIn) || 0;

    if (required > 0 && balance < required) {
      errors.push(`Insufficient ${tokenSymbol} balance. You have ${balance.toFixed(4)} but need ${required}`);
    }

    return { isValid: errors.length === 0, errors };
  }, [pool, swapAmountIn, swapTokenIn, tokenBalances]);



  const userLpBalanceFormatted = useMemo(() => {
    return formatUnits(userLpBalance, 18);
  }, [userLpBalance]);

  const userPoolShare = useMemo(() => {
    if (!pool || !userLpPosition || pool.liquidity === 0n) return 0;
    return (Number(userLpBalance) / Number(pool.liquidity)) * 100;
  }, [pool, userLpPosition, userLpBalance]);

  // Calculate expected swap output using constant product formula
  // amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
  // The 0.3% fee is applied (997/1000)
  const swapOutputEstimate = useMemo(() => {
    if (!pool || !swapAmountIn || parseFloat(swapAmountIn) <= 0) {
      return { amountOut: 0, exchangeRate: 0, priceImpact: 0 };
    }

    const zeroForOne = swapTokenIn === "token0";
    const decimalsIn = getTokenDecimals(zeroForOne ? pool.token0Symbol : pool.token1Symbol);
    const decimalsOut = getTokenDecimals(zeroForOne ? pool.token1Symbol : pool.token0Symbol);

    const reserveIn = zeroForOne ? pool.reserve0 : pool.reserve1;
    const reserveOut = zeroForOne ? pool.reserve1 : pool.reserve0;

    if (reserveIn === 0n || reserveOut === 0n) {
      return { amountOut: 0, exchangeRate: 0, priceImpact: 0 };
    }

    // Parse input amount to wei
    const amountInWei = parseUnits(swapAmountIn, decimalsIn);

    // Calculate output with 0.3% fee: amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
    const numerator = amountInWei * 997n * reserveOut;
    const denominator = reserveIn * 1000n + amountInWei * 997n;
    const amountOutWei = numerator / denominator;

    // Format output
    const amountOut = parseFloat(formatUnits(amountOutWei, decimalsOut));

    // Calculate exchange rate (price of 1 input token in output tokens)
    const reserveInNum = parseFloat(formatUnits(reserveIn, decimalsIn));
    const reserveOutNum = parseFloat(formatUnits(reserveOut, decimalsOut));
    const exchangeRate = reserveInNum > 0 ? reserveOutNum / reserveInNum : 0;

    // Calculate price impact
    const inputAmount = parseFloat(swapAmountIn);
    const idealOutput = inputAmount * exchangeRate;
    const priceImpact = idealOutput > 0 ? ((idealOutput - amountOut) / idealOutput) * 100 : 0;

    return { amountOut, exchangeRate, priceImpact };
  }, [pool, swapAmountIn, swapTokenIn]);

  // Calculate estimated tokens to receive when removing liquidity
  const removeEstimate = useMemo(() => {
    if (!pool || !removeAmount || parseFloat(removeAmount) <= 0) {
      return { token0: 0, token1: 0 };
    }

    const lpAmountWei = parseUnits(removeAmount, 18);
    const totalSupply = pool.liquidity;

    if (totalSupply === 0n) {
      return { token0: 0, token1: 0 };
    }

    const decimals0 = getTokenDecimals(pool.token0Symbol);
    const decimals1 = getTokenDecimals(pool.token1Symbol);

    // user's share of each reserve: (lpAmount / totalSupply) * reserve
    const token0Wei = (lpAmountWei * pool.reserve0) / totalSupply;
    const token1Wei = (lpAmountWei * pool.reserve1) / totalSupply;

    return {
      token0: parseFloat(formatUnits(token0Wei, decimals0)),
      token1: parseFloat(formatUnits(token1Wei, decimals1)),
    };
  }, [pool, removeAmount]);

  const handleSuccess = (result: any) => {
    setError(null);
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
      setError("Please connect MetaMask Flask first");
      return;
    }

    // Validate balances before proceeding
    if (!addLiquidityValidation.isValid) {
      setError(addLiquidityValidation.errors.join(". ") + `. Send tokens to your Quantum Account: ${accountAddress}`);
      return;
    }

    setError(null);

    try {
      // Get token decimals
      const decimals0 = getTokenDecimals(pool.token0Symbol);
      const decimals1 = getTokenDecimals(pool.token1Symbol);

      console.log("[LIQUIDITY] Token0:", pool.token0Symbol, "decimals:", decimals0);
      console.log("[LIQUIDITY] Token1:", pool.token1Symbol, "decimals:", decimals1);

      // Parse amounts with correct decimals
      const amount0Wei = parseUnits(addAmount0 || "0", decimals0);
      const amount1Wei = parseUnits(addAmount1 || "0", decimals1);

      console.log("[LIQUIDITY] Amount0 (wei):", amount0Wei.toString());
      console.log("[LIQUIDITY] Amount1 (wei):", amount1Wei.toString());

      // Use batched operation - approvals + addLiquidity in one transaction!
      // ~30% gas savings vs separate transactions
      const result = await addLiquidityBatched(
        pool.poolKey.currency0,  // tokenA address
        pool.poolKey.currency1,  // tokenB address
        amount0Wei,              // amountA
        amount1Wei,              // amountB
        0n,                      // amountAMin
        0n,                      // amountBMin
      );

      handleSuccess(result);

      // Track transaction and show success modal
      const txHash = result?.transactionHash || "";
      addTransaction("add_liquidity", txHash, {
        fromToken: pool.token0Symbol,
        toToken: pool.token1Symbol,
        fromAmount: addAmount0,
        toAmount: addAmount1,
        poolId: pool.id,
      });
      setSuccessModal({
        isOpen: true,
        type: "add_liquidity",
        txHash,
        details: {
          fromToken: pool.token0Symbol,
          toToken: pool.token1Symbol,
          fromAmount: addAmount0,
          toAmount: addAmount1,
        },
      });
      setAddAmount0("");
      setAddAmount1("");
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!isConnected) {
      setError("Please connect MetaMask Flask first");
      return;
    }

    setError(null);

    try {
      // For remove liquidity, use 18 decimals (LP tokens are in 18 decimal units)
      const liquidityAmount = parseUnits(removeAmount || "0", 18);

      // Get pool address from pool ID (it's the address itself)
      const poolAddress = pool.id;

      // Use batched operation - LP approval + removeLiquidity in one transaction!
      // ~27% gas savings vs separate transactions
      const result = await removeLiquidityBatched(
        pool.poolKey.currency0,  // tokenA address
        pool.poolKey.currency1,  // tokenB address
        poolAddress,             // poolAddress for LP token approval
        liquidityAmount,         // liquidity amount to remove
        0n,                      // amountAMin
        0n,                      // amountBMin
      );

      handleSuccess(result);

      // Track transaction and show success modal
      const txHash = result?.transactionHash || "";
      addTransaction("remove_liquidity", txHash, {
        fromToken: pool.token0Symbol,
        toToken: pool.token1Symbol,
        lpAmount: removeAmount,
        fromAmount: removeEstimate.token0.toFixed(6),
        toAmount: removeEstimate.token1.toFixed(6),
        poolId: pool.id,
      });
      setSuccessModal({
        isOpen: true,
        type: "remove_liquidity",
        txHash,
        details: {
          fromToken: pool.token0Symbol,
          toToken: pool.token1Symbol,
          fromAmount: removeEstimate.token0.toFixed(6),
          toAmount: removeEstimate.token1.toFixed(6),
          lpAmount: removeAmount,
        },
      });
      setRemoveAmount("");
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    }
  };

  const handleSwap = async () => {
    if (!isConnected) {
      setError("Please connect MetaMask Flask first");
      return;
    }

    // Validate balances before proceeding
    if (!swapValidation.isValid) {
      setError(swapValidation.errors.join(". ") + `. Send tokens to your Quantum Account: ${accountAddress}`);
      return;
    }

    setError(null);

    try {
      const zeroForOne = swapTokenIn === "token0";

      // Get correct decimals for the input token
      const tokenInSymbol = zeroForOne ? pool.token0Symbol : pool.token1Symbol;
      const decimalsIn = getTokenDecimals(tokenInSymbol);

      console.log("[SWAP] Token in:", tokenInSymbol, "decimals:", decimalsIn);

      const amountSpecified = parseUnits(swapAmountIn || "0", decimalsIn);

      console.log("[SWAP] Amount (wei):", amountSpecified.toString());

      // Get token addresses
      const tokenIn = zeroForOne
        ? pool.poolKey.currency0
        : pool.poolKey.currency1;

      const tokenOut = zeroForOne
        ? pool.poolKey.currency1
        : pool.poolKey.currency0;

      // Use batched operation - approval + swap in one transaction!
      // ~27% gas savings vs separate transactions
      const result = await swapBatched(
        tokenIn,         // tokenIn address
        tokenOut,        // tokenOut address
        amountSpecified, // amountIn
        0n,              // amountOutMin (should use quote in production)
      );

      handleSuccess(result);

      // Track transaction and show success modal
      const txHash = result?.transactionHash || "";
      const tokenOutSymbol = zeroForOne ? pool.token1Symbol : pool.token0Symbol;
      addTransaction("swap", txHash, {
        fromToken: tokenInSymbol,
        toToken: tokenOutSymbol,
        fromAmount: swapAmountIn,
        toAmount: swapOutputEstimate.amountOut.toFixed(6),
        poolId: pool.id,
      });
      setSuccessModal({
        isOpen: true,
        type: "swap",
        txHash,
        details: {
          fromToken: tokenInSymbol,
          toToken: tokenOutSymbol,
          fromAmount: swapAmountIn,
          toAmount: swapOutputEstimate.amountOut.toFixed(6),
        },
      });
      setSwapAmountIn("");
    } catch (err: any) {
      setError(`Error: ${err.message}`);
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
              <div className="group/fee relative">
                <p className="text-foreground/60 text-sm mb-1 cursor-help border-b border-dashed border-foreground/30 inline-block">FEE_TIER</p>
                <p className={`font-bold ${isQuantumSafe ? 'text-primary' : 'text-foreground'}`}>
                  {isQuantumSafe ? '0.10%' : '0.30%'}
                  {isQuantumSafe && <span className="ml-2 text-xs text-primary">✨ QS Discount</span>}
                </p>
                {!isQuantumSafe && (
                  <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-primary text-black text-xs font-bold rounded opacity-0 group-hover/fee:opacity-100 transition-opacity pointer-events-none z-10 text-center shadow-lg border-2 border-primary-foreground">
                    Standard Tier. Become a QS to unlock 0.1% fees!
                    <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-primary"></div>
                  </div>
                )}
                {isQuantumSafe && (
                  <div className="absolute left-0 bottom-full mb-2 w-56 p-2 bg-primary text-black text-xs font-bold rounded opacity-0 group-hover/fee:opacity-100 transition-opacity pointer-events-none z-10 text-center shadow-lg border-2 border-primary-foreground">
                    🎉 Quantum Safe Active! You pay 0.1% fees (70% discount)
                    <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-primary"></div>
                  </div>
                )}
              </div>
              {pool.poolType === "dark" ? (
                <div className="col-span-2 border border-purple-500/20 bg-purple-500/5 p-4 flex items-center justify-center gap-3">
                  <Lock className="w-5 h-5 text-purple-500" />
                  <p className="text-purple-400 text-sm font-bold">
                    METRICS_HIDDEN_FOR_PRIVACY
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-foreground/60 text-sm mb-1">TVL</p>
                    <p className="text-foreground font-bold text-xl">
                      ${pool.tvl || "0.00"}
                    </p>
                  </div>
                  <div>
                    <p className="text-foreground/60 text-sm mb-1">APY</p>
                    <p className="text-primary font-bold text-xl">
                      {pool.apy || "0.00"}%
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b-2 border-primary">
            {(["overview", "add", "remove", "swap"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 border-b-2 transition pixel-text font-bold ${activeTab === tab
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

                {pool.poolType === "dark" ? (
                  <div className="border border-purple-500/20 bg-purple-500/5 p-8 text-center">
                    <Lock className="w-12 h-12 text-purple-500 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-bold text-purple-400 mb-2">POOLS_METRICS_HIDDEN</h3>
                    <p className="text-foreground/60 max-w-md mx-auto pixel-text">
                      This is a generic pool with enhanced privacy features.
                      Reserves, exchange rates, and liquidity depth are not public.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 border border-primary/50">
                      <p className="text-foreground/60 text-sm mb-2">
                        EXCHANGE_RATE
                      </p>
                      <p className="text-foreground font-bold text-xl">
                        1 {pool.token0Symbol} = {pool.reserve0 > 0n
                          ? (parseFloat(formatUnits(pool.reserve1, getTokenDecimals(pool.token1Symbol))) /
                            parseFloat(formatUnits(pool.reserve0, getTokenDecimals(pool.token0Symbol)))).toFixed(6)
                          : "0"} {pool.token1Symbol}
                      </p>
                    </div>
                    <div className="p-4 border border-primary/50">
                      <p className="text-foreground/60 text-sm mb-2">TOTAL_LP_SUPPLY</p>
                      <p className="text-foreground font-bold text-xl">
                        {parseFloat(formatEther(pool.liquidity)).toFixed(4)} LP
                      </p>
                    </div>
                    <div className="p-4 border border-primary/50">
                      <p className="text-foreground/60 text-sm mb-2">
                        {pool.token0Symbol}_RESERVE
                      </p>
                      <p className="text-foreground font-bold text-xl">
                        {parseFloat(formatUnits(pool.reserve0, getTokenDecimals(pool.token0Symbol))).toFixed(4)}
                      </p>
                    </div>
                    <div className="p-4 border border-primary/50">
                      <p className="text-foreground/60 text-sm mb-2">
                        {pool.token1Symbol}_RESERVE
                      </p>
                      <p className="text-foreground font-bold text-xl">
                        {parseFloat(formatUnits(pool.reserve1, getTokenDecimals(pool.token1Symbol))).toFixed(4)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Investment Analysis */}
                {userLpBalance > 0n && (
                  <div className="p-6 border-2 border-primary bg-primary/5">
                    <h3 className="text-xl font-bold text-primary mb-4">INVESTMENT_ANALYSIS</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-foreground/60 text-sm mb-1">TOKENS_INVESTED</p>
                        <p className="text-foreground font-bold text-sm">
                          {metrics.investedAmount0.toFixed(4)} {pool.token0Symbol}
                        </p>
                        <p className="text-foreground font-bold text-sm">
                          + {metrics.investedAmount1.toFixed(4)} {pool.token1Symbol}
                        </p>
                      </div>
                      <div>
                        <p className="text-foreground/60 text-sm mb-1">HODL_VALUE</p>
                        <p className="text-foreground font-bold text-lg">
                          ${metrics.hodlValueUSD.toFixed(2)}
                        </p>
                        <p className="text-xs text-foreground/50">If you just held tokens</p>
                      </div>
                      <div>
                        <p className="text-foreground/60 text-sm mb-1">CURRENT_LP_VALUE</p>
                        <p className="text-foreground font-bold text-lg">
                          ${metrics.lpValueUSD.toFixed(2)}
                        </p>
                        <p className="text-xs text-foreground/50">Market value of position</p>
                      </div>
                      <div>
                        <p className="text-foreground/60 text-sm mb-1">NET_EARNINGS</p>
                        <p className={`font-bold text-lg ${metrics.netPnL >= 0 ? 'text-primary' : 'text-red-500'}`}>
                          {metrics.netPnL >= 0 ? '+' : ''}${metrics.netPnL.toFixed(2)}
                        </p>
                        <p className={`text-xs ${metrics.roi >= 0 ? 'text-primary' : 'text-red-500'}`}>
                          {metrics.roi.toFixed(2)}% (Fees + IL)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* User's LP Position */}
                {userLpBalance > 0n && (
                  <div className="mt-6 p-6 border-2 border-primary bg-primary/5">
                    <h3 className="text-xl font-bold text-primary mb-4">YOUR_POSITION</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-foreground/60 text-sm mb-1">LP_TOKENS</p>
                        <p className="text-foreground font-bold text-lg">
                          {parseFloat(userLpBalanceFormatted).toFixed(6)} LP
                        </p>
                      </div>
                      <div>
                        <p className="text-foreground/60 text-sm mb-1">POOL_SHARE</p>
                        <p className="text-primary font-bold text-lg">
                          {userPoolShare.toFixed(4)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-foreground/60 text-sm mb-1">POSITION_VALUE</p>
                        <p className="text-foreground font-bold text-lg">
                          ${userLpPosition?.value || "0.00"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {userLpBalance === 0n && isConnected && (
                  <div className="mt-6 p-4 border border-foreground/20 bg-foreground/5 text-center">
                    <p className="text-foreground/60">You don't have any LP tokens in this pool yet.</p>
                    <button
                      onClick={() => setActiveTab("add")}
                      className="mt-2 text-primary hover:underline"
                    >
                      Add Liquidity →
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "add" && (
              <div className="space-y-6 pixel-text">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  ADD_LIQUIDITY
                </h2>

                {/* Error Display */}
                {error && (
                  <div className="p-4 border-2 border-red-500 bg-red-500/10">
                    <div className="flex items-center gap-2 text-red-500 pixel-text">
                      <AlertCircle className="w-5 h-5" />
                      <p>{error}</p>
                    </div>
                  </div>
                )}

                {/* Balance Warning */}
                {!addLiquidityValidation.isValid && !error && (
                  <div className="p-4 border-2 border-yellow-500 bg-yellow-500/10">
                    <div className="flex items-start gap-2 text-yellow-500 pixel-text">
                      <Wallet className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold mb-1">Insufficient Balance</p>
                        {addLiquidityValidation.errors.map((err, i) => (
                          <p key={i} className="text-sm">{err}</p>
                        ))}
                        {accountAddress && (
                          <p className="text-sm mt-2">
                            Send tokens to your Quantum Account:<br />
                            <code className="text-xs bg-black/50 px-1">{accountAddress}</code>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-foreground">
                      TOKEN_0_AMOUNT ({pool.token0Symbol})
                    </label>
                    <input
                      type="number"
                      value={addAmount0}
                      onChange={(e) => setAddAmount0(e.target.value)}
                      className="w-full px-4 py-3 bg-black text-foreground border-2 border-primary pixel-text"
                      placeholder="0.0"
                    />
                    <p className="text-xs text-foreground/50 mt-1">
                      Balance: {getTokenBalance(pool.token0Symbol || "").toFixed(4)} {pool.token0Symbol}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-foreground">
                      TOKEN_1_AMOUNT ({pool.token1Symbol})
                    </label>
                    <input
                      type="number"
                      value={addAmount1}
                      onChange={(e) => setAddAmount1(e.target.value)}
                      className="w-full px-4 py-3 bg-black text-foreground border-2 border-primary pixel-text"
                      placeholder="0.0"
                    />
                    <p className="text-xs text-foreground/50 mt-1">
                      Balance: {getTokenBalance(pool.token1Symbol || "").toFixed(4)} {pool.token1Symbol}
                    </p>
                  </div>
                  <button
                    onClick={handleAddLiquidity}
                    disabled={opsLoading || !isConnected || !addLiquidityValidation.isValid}
                    className="w-full py-3 border-2 border-primary text-primary hover:bg-primary hover:text-black font-bold transition-all pixel-text disabled:opacity-50"
                  >
                    {opsLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                        ADDING...
                      </>
                    ) : !addLiquidityValidation.isValid ? (
                      <>
                        <Wallet className="w-4 h-4 inline mr-2" />
                        INSUFFICIENT_BALANCE
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

                {/* LP Balance Info */}
                <div className="p-4 border border-primary/50 bg-primary/5">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-foreground/60 text-sm">YOUR_LP_BALANCE</p>
                      <p className="text-foreground font-bold text-xl">
                        {parseFloat(userLpBalanceFormatted).toFixed(6)} LP
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-foreground/60 text-sm">POOL_SHARE</p>
                      <p className="text-primary font-bold text-xl">
                        {userPoolShare.toFixed(4)}%
                      </p>
                    </div>
                  </div>
                </div>

                {userLpBalance === 0n && (
                  <div className="p-4 border-2 border-yellow-500/50 bg-yellow-500/10 text-center">
                    <p className="text-yellow-500">You don't have any LP tokens to remove.</p>
                    <button
                      onClick={() => setActiveTab("add")}
                      className="mt-2 text-primary hover:underline"
                    >
                      Add Liquidity First →
                    </button>
                  </div>
                )}

                {userLpBalance > 0n && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-semibold text-foreground">
                          LP_AMOUNT_TO_REMOVE
                        </label>
                        <button
                          onClick={() => setRemoveAmount(userLpBalanceFormatted)}
                          className="text-xs text-primary hover:text-primary/80 border border-primary px-2 py-1"
                        >
                          MAX
                        </button>
                      </div>
                      <input
                        type="number"
                        value={removeAmount}
                        onChange={(e) => setRemoveAmount(e.target.value)}
                        className="w-full px-4 py-3 bg-black text-foreground border-2 border-primary pixel-text"
                        placeholder="0.0"
                        max={userLpBalanceFormatted}
                      />
                      <p className="text-xs text-foreground/50 mt-1">
                        Available: {parseFloat(userLpBalanceFormatted).toFixed(6)} LP
                      </p>
                    </div>

                    {/* Estimated Tokens to Receive */}
                    {parseFloat(removeAmount) > 0 && (
                      <div className="p-4 border border-foreground/30 bg-black/50">
                        <p className="text-foreground/60 text-sm mb-3">YOU_WILL_RECEIVE</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 border border-primary/30 bg-primary/5">
                            <p className="text-foreground/60 text-xs">{pool.token0Symbol}</p>
                            <p className="text-foreground font-bold text-lg">
                              {removeEstimate.token0.toFixed(6)}
                            </p>
                          </div>
                          <div className="p-3 border border-primary/30 bg-primary/5">
                            <p className="text-foreground/60 text-xs">{pool.token1Symbol}</p>
                            <p className="text-foreground font-bold text-lg">
                              {removeEstimate.token1.toFixed(6)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleRemoveLiquidity}
                      disabled={opsLoading || !isConnected || parseFloat(removeAmount) <= 0 || parseFloat(removeAmount) > parseFloat(userLpBalanceFormatted)}
                      className="w-full py-3 border-2 border-primary text-primary hover:bg-primary hover:text-black font-bold transition-all pixel-text disabled:opacity-50"
                    >
                      {opsLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                          REMOVING...
                        </>
                      ) : parseFloat(removeAmount) > parseFloat(userLpBalanceFormatted) ? (
                        "INSUFFICIENT_LP_BALANCE"
                      ) : (
                        "REMOVE_LIQUIDITY"
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "swap" && (
              <div className="space-y-6 pixel-text">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  SWAP_TOKENS
                </h2>

                {/* Error Display */}
                {error && (
                  <div className="p-4 border-2 border-red-500 bg-red-500/10">
                    <div className="flex items-center gap-2 text-red-500 pixel-text">
                      <AlertCircle className="w-5 h-5" />
                      <p>{error}</p>
                    </div>
                  </div>
                )}

                {/* Balance Warning */}
                {!swapValidation.isValid && !error && (
                  <div className="p-4 border-2 border-yellow-500 bg-yellow-500/10">
                    <div className="flex items-start gap-2 text-yellow-500 pixel-text">
                      <Wallet className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold mb-1">Insufficient Balance</p>
                        {swapValidation.errors.map((err, i) => (
                          <p key={i} className="text-sm">{err}</p>
                        ))}
                        {accountAddress && (
                          <p className="text-sm mt-2">
                            Send tokens to your Quantum Account:<br />
                            <code className="text-xs bg-black/50 px-1">{accountAddress}</code>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {/* FROM Token */}
                  <div className="p-4 border-2 border-primary/50 bg-black/50">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-semibold text-foreground/60">FROM</label>
                      <p className="text-xs text-foreground/50">
                        Balance: {getTokenBalance(swapTokenIn === "token0" ? (pool.token0Symbol || "") : (pool.token1Symbol || "")).toFixed(4)}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <select
                        value={swapTokenIn}
                        onChange={(e) => setSwapTokenIn(e.target.value as "token0" | "token1")}
                        className="w-32 px-3 py-3 bg-primary/10 text-foreground border-2 border-primary pixel-text font-bold"
                      >
                        <option value="token0">{pool.token0Symbol || "Token 0"}</option>
                        <option value="token1">{pool.token1Symbol || "Token 1"}</option>
                      </select>
                      <input
                        type="number"
                        value={swapAmountIn}
                        onChange={(e) => setSwapAmountIn(e.target.value)}
                        className="flex-1 px-4 py-3 bg-black text-foreground text-right text-xl border-2 border-primary pixel-text"
                        placeholder="0.0"
                      />
                    </div>
                  </div>

                  {/* Swap Direction Arrow */}
                  <div className="flex justify-center">
                    <div className="p-2 border-2 border-primary bg-black">
                      <ArrowRight className="w-6 h-6 text-primary rotate-90" />
                    </div>
                  </div>

                  {/* TO Token (Output) */}
                  <div className="p-4 border-2 border-primary/50 bg-primary/5">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-semibold text-foreground/60">TO (ESTIMATED)</label>
                      <p className="text-xs text-foreground/50">
                        Balance: {getTokenBalance(swapTokenIn === "token0" ? (pool.token1Symbol || "") : (pool.token0Symbol || "")).toFixed(4)}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-32 px-3 py-3 bg-primary/20 text-foreground border-2 border-primary pixel-text font-bold flex items-center">
                        {swapTokenIn === "token0" ? pool.token1Symbol : pool.token0Symbol}
                      </div>
                      <div className="flex-1 px-4 py-3 bg-black/50 text-foreground text-right text-xl border-2 border-primary/50 pixel-text">
                        {swapOutputEstimate.amountOut > 0
                          ? swapOutputEstimate.amountOut.toFixed(6)
                          : "0.0"}
                      </div>
                    </div>
                  </div>

                  {/* Exchange Rate & Price Impact */}
                  {parseFloat(swapAmountIn) > 0 && (
                    <div className="p-4 border border-foreground/20 bg-black/30 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground/60">EXCHANGE_RATE</span>
                        <span className="text-foreground">
                          1 {swapTokenIn === "token0" ? pool.token0Symbol : pool.token1Symbol} = {swapOutputEstimate.exchangeRate.toFixed(6)} {swapTokenIn === "token0" ? pool.token1Symbol : pool.token0Symbol}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground/60">PRICE_IMPACT</span>
                        <span className={swapOutputEstimate.priceImpact > 5 ? "text-red-500" : swapOutputEstimate.priceImpact > 1 ? "text-yellow-500" : "text-green-500"}>
                          {swapOutputEstimate.priceImpact.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground/60">FEE</span>
                        <span className="text-foreground/80">0.3%</span>
                      </div>
                    </div>
                  )}

                  {/* High Price Impact Warning */}
                  {swapOutputEstimate.priceImpact > 5 && (
                    <div className="p-3 border-2 border-red-500/50 bg-red-500/10">
                      <div className="flex items-center gap-2 text-red-500">
                        <AlertCircle className="w-4 h-4" />
                        <p className="text-sm">High price impact! Consider trading a smaller amount.</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleSwap}
                    disabled={opsLoading || !isConnected || !swapValidation.isValid || parseFloat(swapAmountIn) <= 0}
                    className="w-full py-4 border-2 border-primary text-primary hover:bg-primary hover:text-black font-bold transition-all pixel-text disabled:opacity-50 text-lg"
                  >
                    {opsLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                        SWAPPING...
                      </>
                    ) : !swapValidation.isValid ? (
                      <>
                        <Wallet className="w-5 h-5 inline mr-2" />
                        INSUFFICIENT_BALANCE
                      </>
                    ) : parseFloat(swapAmountIn) <= 0 ? (
                      "ENTER_AMOUNT"
                    ) : (
                      `SWAP ${swapTokenIn === "token0" ? pool.token0Symbol : pool.token1Symbol} → ${swapTokenIn === "token0" ? pool.token1Symbol : pool.token0Symbol}`
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Success Modal */}
      <TransactionSuccessModal
        isOpen={successModal.isOpen}
        onClose={closeSuccessModal}
        type={successModal.type}
        txHash={successModal.txHash}
        details={successModal.details}
      />
    </div>
  );
}
