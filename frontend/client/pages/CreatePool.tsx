import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  ArrowRight,
  Plus,
  Info,
  Loader2,
  CheckCircle,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { useState, useMemo } from "react";
import { usePoolOperations } from "@/hooks/usePoolOperations";
import { useWalletData } from "@/hooks/useWalletData";
import { usePools } from "@/hooks/usePools";
import { useSnap } from "@/hooks/useSnap";
import { parseUnits } from "viem";
import { CONTRACTS } from "@shared/contracts";

// Common token addresses on Sepolia - these should ideally be fetched from a token registry
const TOKEN_ADDRESSES: Record<string, string> = {
  ETH: "0x0000000000000000000000000000000000000000", // Native ETH (address(0) in Uniswap V4)
  WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // Sepolia WETH
  USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Sepolia USDC
  USDT: "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06", // Sepolia USDT (Aave testnet)
  DAI: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357", // Sepolia DAI (Aave testnet)
  PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9", // Sepolia PYUSD
  LINK: "0x779877A7B0D9E8603169DdbD7836e478b4624789", // Sepolia LINK
};

// Token decimals mapping
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
const getTokenDecimals = (symbol: string): number => {
  return TOKEN_DECIMALS[symbol.toUpperCase()] ?? 18;
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
  const [isSuccess, setIsSuccess] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null); // Progress modal state
  const [termsAccepted, setTermsAccepted] = useState(false);
  const navigate = useNavigate();
  const { createPool, approveToken, addLiquidity, loading } =
    usePoolOperations();
  const { refetch: refetchWallet, tokenBalances } = useWalletData();
  const { refetch: refetchPools } = usePools();
  const { isConnected, accountAddress, sendTransaction } = useSnap();

  const tokens = [
    { symbol: "ETH", name: "Ethereum", address: TOKEN_ADDRESSES.ETH },
    { symbol: "WETH", name: "Wrapped Ethereum", address: TOKEN_ADDRESSES.WETH },
    { symbol: "USDC", name: "USD Coin", address: TOKEN_ADDRESSES.USDC },
    { symbol: "USDT", name: "Tether", address: TOKEN_ADDRESSES.USDT },
    { symbol: "DAI", name: "Dai Stablecoin", address: TOKEN_ADDRESSES.DAI },
    { symbol: "PYUSD", name: "PayPal USD", address: TOKEN_ADDRESSES.PYUSD },
    { symbol: "LINK", name: "Chainlink", address: TOKEN_ADDRESSES.LINK },
  ];

  const fees = [
    { value: "0.01", label: "0.01% (Stablecoin pairs)" },
    { value: "0.05", label: "0.05% (Exotic pairs)" },
    { value: "0.25", label: "0.25% (Standard pairs)" },
    { value: "0.30", label: "0.30% (Default)" },
    { value: "1.00", label: "1.00% (High risk)" },
  ];

  const availableTokensForB = tokens.filter((t) => t.symbol !== tokenA);

  // Helper to get token balance from wallet data
  const getTokenBalance = (symbol: string): number => {
    const token = tokenBalances.find((t) => t.symbol === symbol);
    if (!token) return 0;
    return parseFloat(token.amount) || 0;
  };

  // Validate balances for selected tokens
  const balanceValidation = useMemo(() => {
    if (!tokenA || !tokenB || !amountA || !amountB) {
      return { isValid: true, errors: [] };
    }

    const errors: string[] = [];
    const balanceA = getTokenBalance(tokenA);
    const balanceB = getTokenBalance(tokenB);
    const requiredA = parseFloat(amountA) || 0;
    const requiredB = parseFloat(amountB) || 0;

    if (requiredA > 0 && balanceA < requiredA) {
      errors.push(`Insufficient ${tokenA} balance. You have ${balanceA.toFixed(4)} but need ${requiredA}`);
    }
    if (requiredB > 0 && balanceB < requiredB) {
      errors.push(`Insufficient ${tokenB} balance. You have ${balanceB.toFixed(4)} but need ${requiredB}`);
    }

    return { isValid: errors.length === 0, errors };
  }, [tokenA, tokenB, amountA, amountB, tokenBalances]);

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setError("Please connect MetaMask Flask first");
      return;
    }

    // Reset states
    setError(null);
    setTxHash(null);
    setIsSuccess(false);
    setStep(4); // Processing step

    try {
      // Validate balances first
      if (!balanceValidation.isValid) {
        throw new Error(balanceValidation.errors.join(", "));
      }

      // Get token objects
      const tokenAObj = tokens.find((t) => t.symbol === tokenA);
      const tokenBObj = tokens.find((t) => t.symbol === tokenB);
      if (!tokenAObj || !tokenBObj) {
        throw new Error("Invalid token selection");
      }

      // Validate addresses
      if (!tokenAObj.address || tokenAObj.address.length < 42) {
        throw new Error(`Invalid address for ${tokenA}.`);
      }
      if (!tokenBObj.address || tokenBObj.address.length < 42) {
        throw new Error(`Invalid address for ${tokenB}.`);
      }

      console.log("%c[CREATE_POOL] Token A:", "color: #00ffff;", tokenA, tokenAObj.address);
      console.log("%c[CREATE_POOL] Token B:", "color: #00ffff;", tokenB, tokenBObj.address);

      // Calculate pool parameters
      const initialPrice = BigInt("79228162514264337593543950336"); // 2^96 for 1:1
      const tickSpacing = 60;
      const dynamicFee = 0x800000; // Dynamic fee flag for Uniswap V4 hooks

      // Token decimals and amounts
      const decimalsA = getTokenDecimals(tokenA);
      const decimalsB = getTokenDecimals(tokenB);
      const parsedAmountA = parseUnits(amountA, decimalsA);
      const parsedAmountB = parseUnits(amountB, decimalsB);

      console.log("[CREATE_POOL] Amount A (wei):", parsedAmountA.toString());
      console.log("[CREATE_POOL] Amount B (wei):", parsedAmountB.toString());

      // Determine if tokens are ETH
      const isTokenA_ETH = tokenAObj.symbol === "ETH";
      const isTokenB_ETH = tokenBObj.symbol === "ETH";

      // Sort addresses to match Uniswap V4 requirement (currency0 < currency1)
      const [sortedCurrency0, sortedCurrency1] =
        tokenAObj.address.toLowerCase() < tokenBObj.address.toLowerCase()
          ? [tokenAObj.address, tokenBObj.address]
          : [tokenBObj.address, tokenAObj.address];

      // Router address
      // Router address
      const ROUTER_ADDRESS = CONTRACTS.QUANTUM_POOL_ROUTER;

      // Calculate liquidity delta (geometric mean for full range)
      const sqrtApprox = (a: bigint): bigint => {
        if (a < 2n) return a;
        let x = a;
        let y = (x + 1n) / 2n;
        while (y < x) {
          x = y;
          y = (x + a / x) / 2n;
        }
        return x;
      };
      const liquidityDelta = sqrtApprox(parsedAmountA * parsedAmountB);

      // Tick range for full range position
      const tickLower = -887220;
      const tickUpper = 887220;

      // ETH value to send
      let ethValue = 0n;
      if (isTokenA_ETH) ethValue = parsedAmountA;
      if (isTokenB_ETH) ethValue = parsedAmountB;

      const { encodeFunctionData } = await import("viem");
      const MAX_APPROVAL = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

      // Step 1: Initialize pool
      setProgressMessage("Step 1/4: Initializing pool...");
      const initializeData = encodeFunctionData({
        abi: [
          {
            name: "initialize",
            type: "function",
            inputs: [
              {
                name: "key",
                type: "tuple",
                components: [
                  { name: "currency0", type: "address" },
                  { name: "currency1", type: "address" },
                  { name: "fee", type: "uint24" },
                  { name: "tickSpacing", type: "int24" },
                  { name: "hooks", type: "address" },
                ],
              },
              { name: "sqrtPriceX96", type: "uint160" },
            ],
            outputs: [{ name: "tick", type: "int24" }],
          },
        ],
        functionName: "initialize",
        args: [
          {
            currency0: sortedCurrency0 as `0x${string}`,
            currency1: sortedCurrency1 as `0x${string}`,
            fee: dynamicFee,
            tickSpacing: tickSpacing,
            hooks: CONTRACTS.QUANTUM_HOOK as `0x${string}`,
          },
          initialPrice,
        ],
      });

      await sendTransaction(ROUTER_ADDRESS, "0", initializeData);
      console.log("[CREATE_POOL] Pool initialized");

      // Step 2: Approve Token A (if not ETH)
      if (!isTokenA_ETH) {
        setProgressMessage(`Step 2/4: Approving ${tokenA}...`);
        const approveDataA = encodeFunctionData({
          abi: [
            {
              name: "approve",
              type: "function",
              inputs: [
                { name: "spender", type: "address" },
                { name: "amount", type: "uint256" },
              ],
              outputs: [{ name: "success", type: "bool" }],
            },
          ],
          functionName: "approve",
          args: [ROUTER_ADDRESS as `0x${string}`, MAX_APPROVAL],
        });
        await sendTransaction(tokenAObj.address, "0", approveDataA);
        console.log(`[CREATE_POOL] ${tokenA} approved`);
      }

      // Step 3: Approve Token B (if not ETH)
      if (!isTokenB_ETH) {
        setProgressMessage(`Step 3/4: Approving ${tokenB}...`);
        const approveDataB = encodeFunctionData({
          abi: [
            {
              name: "approve",
              type: "function",
              inputs: [
                { name: "spender", type: "address" },
                { name: "amount", type: "uint256" },
              ],
              outputs: [{ name: "success", type: "bool" }],
            },
          ],
          functionName: "approve",
          args: [ROUTER_ADDRESS as `0x${string}`, MAX_APPROVAL],
        });
        await sendTransaction(tokenBObj.address, "0", approveDataB);
        console.log(`[CREATE_POOL] ${tokenB} approved`);
      }

      // Step 4: Add liquidity
      setProgressMessage("Step 4/4: Adding liquidity...");
      const addLiquidityData = encodeFunctionData({
        abi: [
          {
            name: "addLiquidity",
            type: "function",
            inputs: [
              {
                name: "key",
                type: "tuple",
                components: [
                  { name: "currency0", type: "address" },
                  { name: "currency1", type: "address" },
                  { name: "fee", type: "uint24" },
                  { name: "tickSpacing", type: "int24" },
                  { name: "hooks", type: "address" },
                ],
              },
              {
                name: "params",
                type: "tuple",
                components: [
                  { name: "tickLower", type: "int24" },
                  { name: "tickUpper", type: "int24" },
                  { name: "liquidityDelta", type: "int256" },
                  { name: "salt", type: "bytes32" },
                ],
              },
            ],
            outputs: [],
          },
        ],
        functionName: "addLiquidity",
        args: [
          {
            currency0: sortedCurrency0 as `0x${string}`,
            currency1: sortedCurrency1 as `0x${string}`,
            fee: dynamicFee,
            tickSpacing: tickSpacing,
            hooks: CONTRACTS.QUANTUM_HOOK as `0x${string}`,
          },
          {
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidityDelta: liquidityDelta,
            salt: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
          },
        ],
      });

      const result = await sendTransaction(ROUTER_ADDRESS, ethValue.toString(), addLiquidityData);
      console.log("[CREATE_POOL] Liquidity added");

      if (result?.transactionHash) {
        setTxHash(result.transactionHash);
        setIsSuccess(true);
        setProgressMessage("Pool created successfully!");

        // Refresh data
        refetchPools();
        refetchWallet();

        // Navigate to pools page after a delay
        setTimeout(() => {
          navigate("/pools");
        }, 3000);
      } else {
        throw new Error("Transaction failed");
      }
    } catch (err: any) {
      console.error("[CREATE_POOL] Error:", err);
      setError(err.message || "Failed to create pool");
      setProgressMessage(null);
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
            <Link
              to="/pools"
              className="text-primary hover:text-primary/80 transition mb-4 inline-flex items-center gap-2 pixel-text text-sm"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              back_to_pools
            </Link>
            <h1 className="text-4xl font-bold mb-2 pixel-text text-foreground">
              CREATE_POOL
            </h1>
            <p className="text-foreground/60 pixel-text">
              Set up a new quantum-safe liquidity pool and start earning yields
            </p>
          </div>

          {/* Progress Modal */}
          {progressMessage && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-black border-2 border-primary p-8 max-w-md mx-4">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                  <h2 className="text-xl font-bold mb-4 pixel-text text-primary">
                    🔐 Creating Pool
                  </h2>
                  <p className="text-foreground/80 pixel-text mb-4">
                    {progressMessage}
                  </p>
                  <div className="text-left bg-black/50 border border-primary/30 p-4 mt-4">
                    <p className="text-sm text-foreground/60 pixel-text mb-2">Sequential operations:</p>
                    <ul className="text-sm text-foreground/80 pixel-text space-y-1">
                      <li>1. Initialize pool</li>
                      <li>2. Approve Token A</li>
                      <li>3. Approve Token B</li>
                      <li>4. Add liquidity</li>
                    </ul>
                  </div>
                  <p className="text-xs text-foreground/50 mt-4 pixel-text">
                    Each operation signed with quantum-safe Dilithium
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-4 mb-12">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 border-2 font-bold flex items-center justify-center transition-all pixel-text ${s <= step
                    ? "bg-primary text-black border-primary"
                    : "bg-black border-primary/30 text-foreground/60"
                    }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`h-1 w-12 transition-all ${s < step ? "bg-primary" : "bg-primary/30"
                      }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Form Container */}
          <form
            onSubmit={handleCreatePool}
            className="border-2 border-primary p-8 glitch-hover"
          >
            {step === 1 && (
              <div className="space-y-6">
                <div className="pixel-text">
                  <h2 className="text-2xl font-bold mb-2 text-foreground">
                    SELECT_TOKEN_PAIR
                  </h2>
                  <p className="text-foreground/60">
                    Choose the two tokens for your liquidity pool
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Token A */}
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-foreground pixel-text">
                      $ first_token
                    </label>
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
                    <label className="block text-sm font-semibold mb-3 text-foreground pixel-text">
                      $ second_token
                    </label>
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
                        Higher fees attract better yields but may reduce trading
                        volume
                      </div>
                    </div>
                  </label>
                  <div className="space-y-2">
                    {fees.map((f) => (
                      <label
                        key={f.value}
                        className="flex items-center gap-3 p-3 hover:bg-primary/10 cursor-pointer transition border border-primary/30"
                      >
                        <input
                          type="radio"
                          name="fee"
                          value={f.value}
                          checked={fee === f.value}
                          onChange={(e) => setFee(e.target.value)}
                          className="w-4 h-4"
                        />
                        <span className="text-foreground/80 pixel-text text-sm">
                          {f.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Recommendation */}
                {tokenA && tokenB && (
                  <div className="p-4 border-2 border-primary bg-primary/5">
                    <p className="text-sm text-foreground pixel-text">
                      $ Recommended: Your selected pair {tokenA}-{tokenB}{" "}
                      typically works well with a {fee}% fee
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
                  <h2 className="text-2xl font-bold mb-2 text-foreground">
                    SET_LIQUIDITY
                  </h2>
                  <p className="text-foreground/60">
                    Provide equal value of both tokens to initialize the pool
                  </p>
                </div>

                <div className="p-6 border-2 border-primary bg-black mb-6">
                  <p className="text-foreground/60 text-sm mb-2 pixel-text">
                    $ pool_preview
                  </p>
                  <div className="flex items-center gap-4 pixel-text">
                    <div>
                      <p className="lg font-bold text-foreground">{tokenA}</p>
                      <p className="text-foreground/60 text-sm">
                        {amountA || "0"}
                      </p>
                    </div>
                    <Plus className="w-4 h-4 text-foreground/40" />
                    <div>
                      <p className="lg font-bold text-foreground">{tokenB}</p>
                      <p className="text-foreground/60 text-sm">
                        {amountB || "0"}
                      </p>
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

                {/* Balance Warning */}
                {!balanceValidation.isValid && (
                  <div className="p-4 border-2 border-yellow-500 bg-yellow-500/10">
                    <div className="flex items-start gap-2 text-yellow-500 pixel-text">
                      <Wallet className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold mb-1">Insufficient Balance</p>
                        {balanceValidation.errors.map((err, i) => (
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

                <div className="p-4 border-2 border-primary bg-primary/5">
                  <p className="text-sm text-foreground/80 pixel-text">
                    You will receive LP tokens representing your share of the
                    pool. Store these securely.
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
                  <h2 className="text-2xl font-bold mb-2 text-foreground">
                    REVIEW_CONFIRM
                  </h2>
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

                {/* Balance Warning in Step 3 */}
                {!balanceValidation.isValid && !error && (
                  <div className="p-4 border-2 border-yellow-500 bg-yellow-500/10">
                    <div className="flex items-start gap-2 text-yellow-500 pixel-text">
                      <Wallet className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold mb-1">⚠️ Cannot Create Pool - Insufficient Balance</p>
                        {balanceValidation.errors.map((err, i) => (
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
                  <div className="p-4 border-2 border-primary bg-black">
                    <p className="text-foreground/60 text-sm mb-2 pixel-text">
                      $ pool_configuration
                    </p>
                    <div className="space-y-2 pixel-text text-sm">
                      <div className="flex justify-between">
                        <span className="text-foreground/80">token_pair</span>
                        <span className="font-bold text-foreground">
                          {tokenA}-{tokenB}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground/80">fee_tier</span>
                        <span className="font-bold text-foreground">
                          {fee}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground/80">
                          {tokenA}_initial
                        </span>
                        <span className="font-bold text-foreground">
                          {amountA || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground/80">
                          {tokenB}_initial
                        </span>
                        <span className="font-bold text-foreground">
                          {amountB || "0"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-2 border-primary bg-primary/5">
                    <p className="text-sm text-foreground pixel-text">
                      $ Note: Pool creation requires quantum-safe signature
                      verification. Make sure you have sufficient gas fees.
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-4 border-2 border-primary bg-primary/5">
                    <input
                      type="checkbox"
                      id="terms-checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-1 w-4 h-4 border-2 border-primary"
                    />
                    <label htmlFor="terms-checkbox" className="text-sm text-foreground/80 pixel-text cursor-pointer">
                      I understand that liquidity pools involve risks and I
                      accept the terms of service
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
                    disabled={loading || !isConnected || !balanceValidation.isValid || !termsAccepted}
                    className="flex-1 py-3 border-2 border-primary text-primary font-bold hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-2 pixel-text disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        CREATING...
                      </>
                    ) : !balanceValidation.isValid ? (
                      <>
                        <Wallet className="w-4 h-4" />
                        INSUFFICIENT_BALANCE
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
                  <h2 className="text-2xl font-bold mb-2 text-foreground">
                    POOL_CREATED_SUCCESSFULLY
                  </h2>
                  <p className="text-foreground/60 mb-4">
                    Your pool has been created on-chain
                  </p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 transition pixel-text text-sm"
                  >
                    View on Etherscan: {txHash.slice(0, 10)}...
                    {txHash.slice(-8)}
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
                  <h2 className="text-2xl font-bold mb-2 text-foreground">
                    POOL_CREATION_FAILED
                  </h2>
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
              <h3 className="font-bold mb-2 pixel-text text-foreground">
                LP_FEES
              </h3>
              <p className="text-foreground/60 text-sm pixel-text">
                Earn trading fees from every transaction in your pool
              </p>
            </div>
            <div className="border-2 border-primary p-6">
              <div className="w-10 h-10 border-2 border-primary flex items-center justify-center mb-4">
                <Info className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold mb-2 pixel-text text-foreground">
                SMART_ROUTING
              </h3>
              <p className="text-foreground/60 text-sm pixel-text">
                Automatic price discovery with optimal liquidity distribution
              </p>
            </div>
            <div className="border-2 border-primary p-6">
              <div className="w-10 h-10 border-2 border-primary flex items-center justify-center mb-4">
                <Info className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold mb-2 pixel-text text-foreground">
                QUANTUM_SAFE
              </h3>
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
