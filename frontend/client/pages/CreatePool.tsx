import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PoolCreationModal, {
  PoolCreationStep,
} from "@/components/PoolCreationModal";
import PoolTypeSelector from "@/components/PoolTypeSelector";
import { LPTokenEducation } from "@/components/LPTokenEducation";
import {
  ArrowRight,
  Plus,
  Info,
  Loader2,
  CheckCircle,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { usePoolOperations } from "@/hooks/usePoolOperations";
import { useWalletData } from "@/hooks/useWalletData";
import { usePools } from "@/hooks/usePools";
import { useSnap } from "@/hooks/useSnap";
import { parseUnits, formatUnits } from "viem";
import { CONTRACTS } from "@shared/contracts";
import {
  useAccount,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  usePublicClient,
} from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { wagmiConfig } from "@/lib/wagmi";
import { logDarkPoolTransaction } from "@/utils/logger";

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

// Minimal ERC20 ABI
const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

export default function CreatePool() {
  const [step, setStep] = useState(1);
  const [tokenA, setTokenA] = useState("");
  const [tokenB, setTokenB] = useState("");
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [poolType, setPoolType] = useState<"normal" | "dark">("normal");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Pool creation modal state
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [creationSteps, setCreationSteps] = useState<PoolCreationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const navigate = useNavigate();
  const { createPoolBatched, loading } = usePoolOperations();
  const { refetch: refetchWallet, tokenBalances } = useWalletData();
  const { refetch: refetchPools } = usePools();
  const { isConnected, accountAddress, sendTransaction } = useSnap();

  // EOA Hooks
  const { address: eoaAddress, isConnected: isEoaConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

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

  // Fetch EOA Balances
  const { data: eoaEthBalance } = useBalance({ address: eoaAddress });

  const { data: eoaTokenBalances } = useReadContracts({
    contracts: [
      {
        address: TOKEN_ADDRESSES[tokenA] as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: eoaAddress ? [eoaAddress] : undefined,
      },
      {
        address: TOKEN_ADDRESSES[tokenB] as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: eoaAddress ? [eoaAddress] : undefined,
      },
    ],
    query: { enabled: !!eoaAddress && !!tokenA && !!tokenB },
  });

  const getEoaBalance = (symbol: string, index: number) => {
    if (!eoaAddress) return 0;
    if (symbol === "ETH")
      return eoaEthBalance
        ? parseFloat(formatUnits(eoaEthBalance.value, 18))
        : 0;

    const result = eoaTokenBalances?.[index]?.result;
    if (result === undefined) return 0; // Don't block if loading or error on EOA read, assume 0 for check

    const decimals = getTokenDecimals(symbol);
    return parseFloat(formatUnits(result as bigint, decimals));
  };

  // Validate balances for selected tokens (Quantum OR EOA)
  const balanceValidation = useMemo(() => {
    if (!tokenA || !tokenB || !amountA || !amountB) {
      return {
        isValid: true,
        errors: [],
        needsDepositA: false,
        needsDepositB: false,
      };
    }

    const errors: string[] = [];

    // Quantum Balances
    const qBalanceA = getTokenBalance(tokenA);
    const qBalanceB = getTokenBalance(tokenB);

    // EOA Balances
    const eoaBalanceA = getEoaBalance(tokenA, 0);
    const eoaBalanceB = getEoaBalance(tokenB, 1);

    const requiredA = parseFloat(amountA) || 0;
    const requiredB = parseFloat(amountB) || 0;

    let needsDepositA = false;
    let needsDepositB = false;

    // Check Token A
    if (requiredA > 0) {
      if (qBalanceA < requiredA) {
        // Check if EOA has enough to cover the deficit
        const deficit = requiredA - qBalanceA;
        if (eoaBalanceA >= deficit) {
          needsDepositA = true;
        } else {
          // Total verification: Q + EOA
          if (qBalanceA + eoaBalanceA < requiredA) {
            errors.push(
              `Insufficient ${tokenA} balance. Total: ${(qBalanceA + eoaBalanceA).toFixed(4)} (Quantum: ${qBalanceA.toFixed(4)}, EOA: ${eoaBalanceA.toFixed(4)}) needed: ${requiredA}`,
            );
          } else {
            needsDepositA = true;
          }
        }
      }
    }

    // Check Token B
    if (requiredB > 0) {
      if (qBalanceB < requiredB) {
        const deficit = requiredB - qBalanceB;
        if (eoaBalanceB >= deficit) {
          needsDepositB = true;
        } else {
          if (qBalanceB + eoaBalanceB < requiredB) {
            errors.push(
              `Insufficient ${tokenB} balance. Total: ${(qBalanceB + eoaBalanceB).toFixed(4)} (Quantum: ${qBalanceB.toFixed(4)}, EOA: ${eoaBalanceB.toFixed(4)}) needed: ${requiredB}`,
            );
          } else {
            needsDepositB = true;
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      needsDepositA,
      needsDepositB,
    };
  }, [
    tokenA,
    tokenB,
    amountA,
    amountB,
    tokenBalances,
    eoaTokenBalances,
    eoaEthBalance,
    eoaAddress,
  ]);

  // Helper function to update a specific step
  const updateStep = useCallback(
    (stepId: string, updates: Partial<PoolCreationStep>) => {
      setCreationSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, ...updates } : s)),
      );
    },
    [],
  );

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

    // Initialize creation steps
    const initialSteps: PoolCreationStep[] = [];

    if (balanceValidation.needsDepositA) {
      initialSteps.push({
        id: "deposit_a",
        title: `DEPOSIT_${tokenA}`,
        description: `Transferring ${tokenA} to Quantum Account`,
        status: "pending",
      });
    }
    if (balanceValidation.needsDepositB) {
      initialSteps.push({
        id: "deposit_b",
        title: `DEPOSIT_${tokenB}`,
        description: `Transferring ${tokenB} to Quantum Account`,
        status: "pending",
      });
    }

    initialSteps.push(
      {
        id: "create_pool",
        title: "CREATE_POOL",
        description: `Initializing ${poolType === "dark" ? "dark " : ""}${tokenA}/${tokenB} pool`,
        status: "pending",
      },
      {
        id: "approve_tokens",
        title: "APPROVE_TOKENS",
        description: "Approving tokens for router",
        status: "pending",
      },
      {
        id: "add_liquidity",
        title: "ADD_LIQUIDITY",
        description: "Adding initial liquidity",
        status: "pending",
      },
    );

    setCreationSteps(initialSteps);
    setCurrentStepIndex(0);
    setShowCreationModal(true);
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

      if (!accountAddress) throw new Error("Quantum Account address missing");

      console.log(
        "%c[CREATE_POOL] Token A:",
        "color: #00ffff;",
        tokenA,
        tokenAObj.address,
      );
      console.log(
        "%c[CREATE_POOL] Token B:",
        "color: #00ffff;",
        tokenB,
        tokenBObj.address,
      );

      // Token decimals and amounts
      const decimalsA = getTokenDecimals(tokenA);
      const decimalsB = getTokenDecimals(tokenB);
      const parsedAmountA = parseUnits(amountA, decimalsA);
      const parsedAmountB = parseUnits(amountB, decimalsB);

      console.log("[CREATE_POOL] Amount A (wei):", parsedAmountA.toString());
      console.log("[CREATE_POOL] Amount B (wei):", parsedAmountB.toString());

      // --- Execute Auto-Deposits ---

      // Deposit A
      if (balanceValidation.needsDepositA) {
        updateStep("deposit_a", { status: "active" });

        const currentQBalance = parseUnits(
          getTokenBalance(tokenA).toString(),
          decimalsA,
        );
        let deficit = parsedAmountA;
        if (currentQBalance > 0n) {
          deficit = parsedAmountA - currentQBalance;
        }

        if (deficit > 0n) {
          if (tokenA === "ETH") {
            throw new Error(
              "Please deposit ETH manually to your Quantum Account first.",
            );
          }

          const txHashA = await writeContractAsync({
            address: tokenAObj.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "transfer",
            args: [accountAddress as `0x${string}`, deficit],
          });

          await waitForTransactionReceipt(wagmiConfig, { hash: txHashA });
          updateStep("deposit_a", { status: "complete", txHash: txHashA });
          // Short delay to let balance update
          await new Promise((r) => setTimeout(r, 2000));
          await refetchWallet();
        } else {
          updateStep("deposit_a", { status: "complete" });
        }
      }

      // Deposit B
      if (balanceValidation.needsDepositB) {
        updateStep("deposit_b", { status: "active" });

        const currentQBalance = parseUnits(
          getTokenBalance(tokenB).toString(),
          decimalsB,
        );
        let deficit = parsedAmountB;
        if (currentQBalance > 0n) {
          deficit = parsedAmountB - currentQBalance;
        }

        if (deficit > 0n) {
          if (tokenB === "ETH") {
            throw new Error(
              "Please deposit ETH manually to your Quantum Account first.",
            );
          }

          const txHashB = await writeContractAsync({
            address: tokenBObj.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "transfer",
            args: [accountAddress as `0x${string}`, deficit],
          });

          await waitForTransactionReceipt(wagmiConfig, { hash: txHashB });
          updateStep("deposit_b", { status: "complete", txHash: txHashB });
          await new Promise((r) => setTimeout(r, 2000));
          await refetchWallet();
        } else {
          updateStep("deposit_b", { status: "complete" });
        }
      }

      // --- Execute Quantum Batch ---

      // Update step 1 as active
      updateStep("create_pool", { status: "active" });

      // Call Atomic Batch Creation
      const result = await createPoolBatched(
        tokenAObj.address,
        tokenBObj.address,
        parsedAmountA,
        parsedAmountB,
        poolType,
      );

      // Mark steps as complete based on result
      if (result?.transactionHash) {
        // Log Dark Pool Transaction details to console
        try {
          const receipt = await publicClient.getTransactionReceipt({ 
            hash: result.transactionHash as `0x${string}` 
          });
          logDarkPoolTransaction(receipt);
        } catch (e) {
          console.error("Failed to log Dark Pool transaction details:", e);
        }

        // Mark all quantum steps as complete
        setCreationSteps((prev) =>
          prev.map((s) => {
            if (s.id.startsWith("deposit")) return s;
            return {
              ...s,
              status: "complete" as const,
              txHash: result.transactionHash,
            };
          }),
        );

        setTxHash(result.transactionHash);
        setIsSuccess(true);

        // Refresh data
        refetchPools();
        refetchWallet();

        // Navigate to pools page after a delay
        setTimeout(() => {
          setShowCreationModal(false);
          navigate("/pools");
        }, 3000);
      } else {
        throw new Error("Transaction failed - No Hash");
      }
    } catch (err: any) {
      console.error("[CREATE_POOL] Error:", err);
      const errorMessage = err.message || "Failed to create pool";
      setError(errorMessage);

      // Mark current step as error
      setCreationSteps((prev) =>
        prev.map((s, i) =>
          s.status === "active" ? { ...s, status: "error" as const } : s,
        ),
      );

      setStep(5); // Error step
    }
  };

  const handleCloseModal = () => {
    setShowCreationModal(false);
    if (isSuccess) {
      navigate("/pools");
    } else if (error) {
      setStep(3); // Go back to review step
      setError(null);
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
          <PoolCreationModal
            isOpen={showCreationModal}
            steps={creationSteps}
            currentStepIndex={currentStepIndex}
            error={error}
            onClose={handleCloseModal}
            canClose={isSuccess || !!error}
          />
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

                {/* Recommendation */}
                {tokenA && tokenB && (
                  <div className="p-4 border-2 border-primary bg-primary/5">
                    <p className="text-sm text-foreground pixel-text">
                      $ Fees are determined dynamically by the Quantum Hook
                      based on user identity (0.15% - 0.40%).
                    </p>
                  </div>
                )}

                {/* Pool Type Selector */}
                {tokenA && tokenB && (
                  <PoolTypeSelector
                    selectedType={poolType}
                    onSelectType={setPoolType}
                    tradeAmountUSD={parseFloat(amountA || "0") * 2000} // Rough estimate assuming token ~$2000
                  />
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
                          <p key={i} className="text-sm">
                            {err}
                          </p>
                        ))}
                        {accountAddress && (
                          <p className="text-sm mt-2">
                            Send tokens to your Quantum Account:
                            <br />
                            <code className="text-xs bg-black/50 px-1">
                              {accountAddress}
                            </code>
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

                {/* LP Token Education */}
                <div className="mt-6">
                  <LPTokenEducation />
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
                        <p className="font-bold mb-1">
                          ⚠️ Cannot Create Pool - Insufficient Balance
                        </p>
                        {balanceValidation.errors.map((err, i) => (
                          <p key={i} className="text-sm">
                            {err}
                          </p>
                        ))}
                        {accountAddress && (
                          <p className="text-sm mt-2">
                            Send tokens to your Quantum Account:
                            <br />
                            <code className="text-xs bg-black/50 px-1">
                              {accountAddress}
                            </code>
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
                          Dynamic (Identity-Based)
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
                    <label
                      htmlFor="terms-checkbox"
                      className="text-sm text-foreground/80 pixel-text cursor-pointer"
                    >
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
                    disabled={
                      loading ||
                      !isConnected ||
                      !balanceValidation.isValid ||
                      !termsAccepted
                    }
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
                Dynamic fees (0.15% - 0.40%) automatically applied based on user
                quantum safety status
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
