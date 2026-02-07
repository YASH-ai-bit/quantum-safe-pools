import { useState, useEffect } from "react";
import { X, ArrowDown, Loader2, RefreshCw } from "lucide-react";
import { usePools } from "@/hooks/usePools";
import { useWalletData } from "@/hooks/useWalletData";
import { usePoolOperations } from "@/hooks/usePoolOperations";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { parseUnits, formatUnits } from "viem";

interface SwapModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface TokenOption {
    symbol: string;
    address: string;
    balance: string;
}

export default function SwapModal({ isOpen, onClose }: SwapModalProps) {
    const { pools, loading: poolsLoading } = usePools();
    const { tokenBalances, refetch: refetchWallet } = useWalletData();
    const { swap } = usePoolOperations();
    const { addTransaction } = useTransactionHistory();

    // Available tokens from pools
    const [availableTokens, setAvailableTokens] = useState<TokenOption[]>([]);
    const [tokenIn, setTokenIn] = useState<string>("");
    const [tokenOut, setTokenOut] = useState<string>("");
    const [amountIn, setAmountIn] = useState<string>("");
    const [estimatedOut, setEstimatedOut] = useState<string>("0");
    const [selectedPool, setSelectedPool] = useState<string | null>(null);
    const [exchangeRate, setExchangeRate] = useState<string>("0");
    const [error, setError] = useState<string | null>(null);
    const [isSwapping, setIsSwapping] = useState(false);

    // Extract unique tokens from pools
    useEffect(() => {
        if (pools.length > 0) {
            const tokenMap = new Map<string, TokenOption>();

            pools.forEach(pool => {
                // Token 0
                if (pool.poolKey.currency0 && pool.poolKey.currency0 !== "0x0000000000000000000000000000000000000000") {
                    const balance = tokenBalances.find(t =>
                        t.address?.toLowerCase() === pool.poolKey.currency0.toLowerCase()
                    )?.amount || "0";
                    tokenMap.set(pool.poolKey.currency0, {
                        symbol: pool.token0Symbol || pool.poolKey.currency0.slice(0, 6),
                        address: pool.poolKey.currency0,
                        balance
                    });
                } else {
                    // ETH (address 0)
                    const ethBalance = tokenBalances.find(t => t.symbol === "ETH")?.amount || "0";
                    tokenMap.set("0x0000000000000000000000000000000000000000", {
                        symbol: "ETH",
                        address: "0x0000000000000000000000000000000000000000",
                        balance: ethBalance
                    });
                }

                // Token 1
                if (pool.poolKey.currency1 && pool.poolKey.currency1 !== "0x0000000000000000000000000000000000000000") {
                    const balance = tokenBalances.find(t =>
                        t.address?.toLowerCase() === pool.poolKey.currency1.toLowerCase()
                    )?.amount || "0";
                    tokenMap.set(pool.poolKey.currency1, {
                        symbol: pool.token1Symbol || pool.poolKey.currency1.slice(0, 6),
                        address: pool.poolKey.currency1,
                        balance
                    });
                } else {
                    const ethBalance = tokenBalances.find(t => t.symbol === "ETH")?.amount || "0";
                    tokenMap.set("0x0000000000000000000000000000000000000000", {
                        symbol: "ETH",
                        address: "0x0000000000000000000000000000000000000000",
                        balance: ethBalance
                    });
                }
            });

            setAvailableTokens(Array.from(tokenMap.values()));
        }
    }, [pools, tokenBalances]);

    // Find matching pool and calculate estimate when tokens change
    useEffect(() => {
        if (!tokenIn || !tokenOut || !amountIn || parseFloat(amountIn) <= 0) {
            setEstimatedOut("0");
            setSelectedPool(null);
            setExchangeRate("0");
            return;
        }

        // Find pool that has both tokens
        const matchingPool = pools.find(pool => {
            const c0 = pool.poolKey.currency0.toLowerCase();
            const c1 = pool.poolKey.currency1.toLowerCase();
            const tIn = tokenIn.toLowerCase();
            const tOut = tokenOut.toLowerCase();

            return (c0 === tIn && c1 === tOut) || (c0 === tOut && c1 === tIn);
        });

        if (matchingPool) {
            setSelectedPool(matchingPool.id);

            // Calculate estimate based on reserves (constant product AMM)
            const c0 = matchingPool.poolKey.currency0.toLowerCase();
            const isTokenInFirst = c0 === tokenIn.toLowerCase();

            const reserveIn = isTokenInFirst ? matchingPool.reserve0 : matchingPool.reserve1;
            const reserveOut = isTokenInFirst ? matchingPool.reserve1 : matchingPool.reserve0;

            // x * y = k formula: amountOut = reserveOut - k / (reserveIn + amountIn)
            // Simplified: amountOut = amountIn * reserveOut / (reserveIn + amountIn)
            const amountInWei = parseUnits(amountIn, 18);
            const amountOutWei = (amountInWei * reserveOut) / (reserveIn + amountInWei);
            const amountOutFormatted = formatUnits(amountOutWei, 18);

            setEstimatedOut(parseFloat(amountOutFormatted).toFixed(6));

            // Calculate exchange rate
            const rate = Number(reserveOut) / Number(reserveIn);
            setExchangeRate(rate.toFixed(6));
        } else {
            setSelectedPool(null);
            setEstimatedOut("0");
            setExchangeRate("0");
        }
    }, [tokenIn, tokenOut, amountIn, pools]);

    const handleSwap = async () => {
        if (!tokenIn || !tokenOut || !amountIn || !selectedPool) {
            setError("Please select tokens and enter an amount");
            return;
        }

        setError(null);
        setIsSwapping(true);

        try {
            const amountInWei = parseUnits(amountIn, 18);

            // Calculate ETH value if swapping ETH
            const ethValue = tokenIn === "0x0000000000000000000000000000000000000000" ? amountInWei.toString() : "0";

            // Execute swap (hook handles approvals internally)
            const result = await swap(tokenIn, tokenOut, amountInWei, 0n, ethValue);

            // Track transaction
            const tokenInSymbol = availableTokens.find(t => t.address === tokenIn)?.symbol || "TOKEN";
            const tokenOutSymbol = availableTokens.find(t => t.address === tokenOut)?.symbol || "TOKEN";

            addTransaction(
                "swap",
                result.transactionHash,
                {
                    fromToken: tokenInSymbol,
                    fromAmount: amountIn,
                    toToken: tokenOutSymbol,
                    toAmount: estimatedOut,
                }
            );

            // Reset form and close
            setAmountIn("");
            setEstimatedOut("0");
            refetchWallet();
            onClose();
        } catch (err: any) {
            console.error("Swap error:", err);
            setError(err.message || "Swap failed");
        } finally {
            setIsSwapping(false);
        }
    };

    const swapTokens = () => {
        const temp = tokenIn;
        setTokenIn(tokenOut);
        setTokenOut(temp);
        setAmountIn("");
    };

    const getTokenSymbol = (address: string) => {
        return availableTokens.find(t => t.address === address)?.symbol || address.slice(0, 6);
    };

    const getTokenBalance = (address: string) => {
        return availableTokens.find(t => t.address === address)?.balance || "0";
    };

    const setMaxAmount = () => {
        const balance = getTokenBalance(tokenIn);
        setAmountIn(balance);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="relative w-full max-w-md border-2 border-primary bg-black p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-foreground pixel-text">SWAP_TOKENS</h2>
                    <button
                        onClick={onClose}
                        className="text-foreground/60 hover:text-primary transition"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {poolsLoading ? (
                    <div className="flex flex-col items-center py-12">
                        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                        <p className="text-foreground/60 pixel-text">Loading pools...</p>
                    </div>
                ) : pools.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-foreground/60 pixel-text">No pools available for swapping</p>
                    </div>
                ) : (
                    <>
                        {/* From Token */}
                        <div className="mb-4">
                            <label className="text-foreground/60 text-sm pixel-text block mb-2">From</label>
                            <div className="border-2 border-primary bg-black p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <select
                                        value={tokenIn}
                                        onChange={(e) => setTokenIn(e.target.value)}
                                        className="bg-transparent text-foreground font-bold pixel-text text-lg focus:outline-none cursor-pointer"
                                    >
                                        <option value="" className="bg-black">Select token</option>
                                        {availableTokens
                                            .filter(t => t.address !== tokenOut)
                                            .map(token => (
                                                <option key={token.address} value={token.address} className="bg-black">
                                                    {token.symbol}
                                                </option>
                                            ))
                                        }
                                    </select>
                                    <button
                                        onClick={setMaxAmount}
                                        className="text-primary text-xs pixel-text hover:underline"
                                        disabled={!tokenIn}
                                    >
                                        MAX
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    value={amountIn}
                                    onChange={(e) => setAmountIn(e.target.value)}
                                    placeholder="0.0"
                                    className="w-full bg-transparent text-2xl font-bold text-foreground pixel-text focus:outline-none"
                                />
                                {tokenIn && (
                                    <p className="text-foreground/40 text-xs pixel-text mt-2">
                                        Balance: {getTokenBalance(tokenIn)} {getTokenSymbol(tokenIn)}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Swap Direction Button */}
                        <div className="flex justify-center -my-2 relative z-10">
                            <button
                                onClick={swapTokens}
                                className="w-10 h-10 border-2 border-primary bg-black flex items-center justify-center hover:bg-primary/20 transition"
                            >
                                <ArrowDown className="w-5 h-5 text-primary" />
                            </button>
                        </div>

                        {/* To Token */}
                        <div className="mb-4">
                            <label className="text-foreground/60 text-sm pixel-text block mb-2">To</label>
                            <div className="border-2 border-primary/50 bg-black p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <select
                                        value={tokenOut}
                                        onChange={(e) => setTokenOut(e.target.value)}
                                        className="bg-transparent text-foreground font-bold pixel-text text-lg focus:outline-none cursor-pointer"
                                    >
                                        <option value="" className="bg-black">Select token</option>
                                        {availableTokens
                                            .filter(t => t.address !== tokenIn)
                                            .map(token => (
                                                <option key={token.address} value={token.address} className="bg-black">
                                                    {token.symbol}
                                                </option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <p className="text-2xl font-bold text-foreground pixel-text">
                                    {estimatedOut}
                                </p>
                                {tokenOut && (
                                    <p className="text-foreground/40 text-xs pixel-text mt-2">
                                        Balance: {getTokenBalance(tokenOut)} {getTokenSymbol(tokenOut)}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Exchange Rate & Pool Info */}
                        {selectedPool && (
                            <div className="border-t-2 border-primary/30 pt-4 mb-4 space-y-2">
                                <div className="flex justify-between text-sm pixel-text">
                                    <span className="text-foreground/60">Exchange Rate</span>
                                    <span className="text-foreground">
                                        1 {getTokenSymbol(tokenIn)} ≈ {exchangeRate} {getTokenSymbol(tokenOut)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm pixel-text">
                                    <span className="text-foreground/60">Pool</span>
                                    <span className="text-primary">{selectedPool.slice(0, 6)}...{selectedPool.slice(-4)}</span>
                                </div>
                                <div className="flex justify-between text-sm pixel-text">
                                    <span className="text-foreground/60">Fee</span>
                                    <span className="text-foreground">0.3%</span>
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-500/20 border border-red-500 text-red-400 text-sm pixel-text">
                                {error}
                            </div>
                        )}

                        {/* No matching pool warning */}
                        {tokenIn && tokenOut && !selectedPool && (
                            <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500 text-yellow-400 text-sm pixel-text">
                                No pool found for this token pair
                            </div>
                        )}

                        {/* Swap Button */}
                        <button
                            onClick={handleSwap}
                            disabled={!selectedPool || !amountIn || parseFloat(amountIn) <= 0 || isSwapping}
                            className="w-full py-4 bg-primary text-black font-bold pixel-text text-lg hover:bg-primary/80 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSwapping ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    SWAPPING...
                                </>
                            ) : (
                                "SWAP"
                            )}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
