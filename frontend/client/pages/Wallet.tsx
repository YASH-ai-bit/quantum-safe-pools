import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useWalletData } from "@/hooks/useWalletData";
import { useSnap } from "@/hooks/useSnap";
import { useAccount, useSendTransaction, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, isAddress, parseUnits, formatUnits, encodeFunctionData } from "viem";
import { CONTRACTS } from "@shared/contracts";
import {
    Copy,
    Send,
    ArrowDownLeft,
    Wallet as WalletIcon,
    Loader2,
    RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Minimal ERC20 ABI for transfers and balance checks
const ERC20_ABI = [
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'decimals',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }],
    }
] as const;

export default function Wallet() {
    const { tokenBalances, loading: loadingBalances, refetch } = useWalletData();
    const { accountAddress, isConnected: isSnapConnected, sendTransaction } = useSnap();
    const { address: eoaAddress, isConnected: isEoaConnected } = useAccount();
    const { sendTransaction: sendEoaTransaction, isPending: isEoaPending, data: ethTxHash } = useSendTransaction();
    const { writeContract, data: erc20TxHash, isPending: isErc20Pending, error: erc20Error } = useWriteContract();
    const { toast } = useToast();

    // Wait for transactions
    const { isLoading: isEthConfirming, isSuccess: isEthSuccess } = useWaitForTransactionReceipt({ hash: ethTxHash });
    const { isLoading: isErc20Confirming, isSuccess: isErc20Success } = useWaitForTransactionReceipt({ hash: erc20TxHash });

    const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'deposit'>('send');
    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");
    const [selectedToken, setSelectedToken] = useState("ETH");
    const [txHash, setTxHash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    // EOA Balances
    const { data: ethBalance } = useBalance({ address: eoaAddress });

    // Helper to get token config
    const getTokenConfig = (symbol: string) => {
        switch (symbol) {
            case 'USDC': return { address: CONTRACTS.TOKENS.USDC, decimals: 6 };
            case 'PYUSD': return { address: CONTRACTS.TOKENS.PYUSD, decimals: 6 };
            case 'LINK': return { address: CONTRACTS.TOKENS.LINK, decimals: 18 };
            default: return { address: undefined, decimals: 18 };
        }
    };

    const currentToken = getTokenConfig(selectedToken);

    // Read ERC20 Balance if selected
    const { data: erc20Balance } = useReadContract({
        address: currentToken.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: eoaAddress ? [eoaAddress] : undefined,
        query: { enabled: !!eoaAddress && selectedToken !== 'ETH' }
    });

    // Formatting helper
    const getFormattedBalance = () => {
        if (selectedToken === 'ETH') return ethBalance ? parseFloat(formatUnits(ethBalance.value, 18)).toFixed(4) : '0.00';
        if (erc20Balance !== undefined) return parseFloat(formatUnits(erc20Balance, currentToken.decimals)).toFixed(2);
        return '0.00';
    };

    // Effect to handle success toasts
    useEffect(() => {
        if (isEthSuccess || isErc20Success) {
            toast({
                title: "Deposit Successful",
                description: "Funds have been deposited to your Quantum Account.",
            });
            setAmount("");
            // Logic to refetch balances would go here
        }
    }, [isEthSuccess, isErc20Success, toast]);

    // Effect to handle ERC20 errors
    useEffect(() => {
        if (erc20Error) {
            setError(erc20Error.message);
        }
    }, [erc20Error]);


    const handleCopyAddress = () => {
        if (accountAddress) {
            navigator.clipboard.writeText(accountAddress);
            toast({
                title: "Address Copied",
                description: "Quantum account address copied to clipboard",
            });
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSnapConnected || !accountAddress) {
            setError("Please connect your Quantum Wallet");
            return;
        }
        if (!isAddress(recipient)) {
            setError("Invalid recipient address");
            return;
        }

        setError(null);
        setIsSending(true);
        setTxHash(null);

        try {
            console.log(`[WALLET] Sending ${amount} ${selectedToken} to ${recipient}`);

            if (selectedToken === 'ETH') {
                const value = parseEther(amount).toString();
                const result = await sendTransaction(recipient, value, "0x");

                if (result.transactionHash) {
                    setTxHash(result.transactionHash);
                    toast({
                        title: "Transaction Sent",
                        description: "Your funds have been sent securely.",
                    });
                    setAmount("");
                    setRecipient("");
                    refetch();
                }
            } else {
                // ERC20 Transfer
                const tokenConfig = getTokenConfig(selectedToken);
                if (!tokenConfig.address) {
                    throw new Error("Token address not found");
                }

                const amountBigInt = parseUnits(amount, tokenConfig.decimals);
                const data = encodeFunctionData({
                    abi: ERC20_ABI,
                    functionName: 'transfer',
                    args: [recipient as `0x${string}`, amountBigInt]
                });

                const result = await sendTransaction(tokenConfig.address, "0", data);

                if (result.transactionHash) {
                    setTxHash(result.transactionHash);
                    toast({
                        title: "Transaction Sent",
                        description: `Sent ${amount} ${selectedToken} securely.`,
                    });
                    setAmount("");
                    setRecipient("");
                    refetch();
                }
            }

        } catch (err: any) {
            console.error("Send error:", err);
            setError(err.message || "Transaction failed");
        } finally {
            setIsSending(false);
        }
    };

    const handleDeposit = () => {
        if (!isEoaConnected) {
            setError("Please connect your External Wallet (EOA) to deposit");
            return;
        }
        if (!accountAddress) return;

        setError(null);
        setTxHash(null);

        try {
            if (selectedToken === 'ETH') {
                sendEoaTransaction({
                    to: accountAddress as `0x${string}`,
                    value: parseEther(amount),
                });
            } else {
                // ERC20 Transfer
                if (!currentToken.address) return;

                const units = parseUnits(amount, currentToken.decimals);
                writeContract({
                    address: currentToken.address as `0x${string}`,
                    abi: ERC20_ABI,
                    functionName: 'transfer',
                    args: [accountAddress as `0x${string}`, units],
                } as any);
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    const isPending = isEoaPending || isErc20Pending || isEthConfirming || isErc20Confirming;

    return (
        <div className="min-h-screen flex flex-col bg-black">
            <Header />

            <main className="flex-1 pt-24 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">

                    {/* Wallet Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-4xl font-bold mb-2 pixel-text text-foreground">
                                QUANTUM_WALLET
                            </h1>
                            <p className="text-foreground/60 pixel-text">
                                Manage your quantum-safe sub-account assets
                            </p>
                        </div>

                        {accountAddress && (
                            <div className="flex items-center gap-2 p-3 border-2 border-primary bg-primary/10 glitch-hover">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-sm font-mono text-primary">
                                    {accountAddress.slice(0, 6)}...{accountAddress.slice(-4)}
                                </span>
                                <button onClick={handleCopyAddress} className="ml-2 hover:text-white transition">
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                        {/* Balances Card */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="border-2 border-primary p-6 bg-black h-full glitch-hover">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold pixel-text text-foreground flex items-center gap-2">
                                        <WalletIcon className="w-5 h-5 text-primary" />
                                        $ balances
                                    </h2>
                                    <button onClick={() => refetch()} className="text-foreground/60 hover:text-primary transition">
                                        <RefreshCw className={`w-4 h-4 ${loadingBalances ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {loadingBalances ? (
                                        <div className="text-center py-8">
                                            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                                            <p className="mt-2 text-sm text-foreground/60 pixel-text">Fetching data...</p>
                                        </div>
                                    ) : tokenBalances.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {tokenBalances.map((token) => (
                                                <div key={token.symbol} className="p-4 border border-primary/30 hover:bg-primary/5 transition">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-bold text-foreground text-lg">{token.amount}</p>
                                                            <p className="text-sm text-foreground/60">{token.symbol}</p>
                                                        </div>
                                                        <div className="px-2 py-1 bg-primary/20 text-xs text-primary font-mono rounded">
                                                            {token.symbol === 'ETH' ? 'Native' : 'ERC20'}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-foreground/40 pixel-text">
                                            No assets found. Deposit some ETH to get started.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Actions Panel */}
                        <div className="border-2 border-primary bg-black p-0 overflow-hidden flex flex-col h-full">
                            {/* Tabs */}
                            <div className="flex border-b-2 border-primary">
                                <button
                                    onClick={() => setActiveTab('send')}
                                    className={`flex-1 py-3 font-bold pixel-text text-sm transition-colors ${activeTab === 'send' ? 'bg-primary text-black' : 'text-foreground hover:bg-white/5'}`}
                                >
                                    SEND
                                </button>
                                <button
                                    onClick={() => setActiveTab('receive')}
                                    className={`flex-1 py-3 font-bold pixel-text text-sm transition-colors ${activeTab === 'receive' ? 'bg-primary text-black' : 'text-foreground hover:bg-white/5'}`}
                                >
                                    RECEIVE
                                </button>
                                <button
                                    onClick={() => setActiveTab('deposit')}
                                    className={`flex-1 py-3 font-bold pixel-text text-sm transition-colors ${activeTab === 'deposit' ? 'bg-primary text-black' : 'text-foreground hover:bg-white/5'}`}
                                >
                                    DEPOSIT
                                </button>
                            </div>

                            <div className="p-6 flex-1">
                                {/* SEND FORM */}
                                {activeTab === 'send' && (
                                    <form onSubmit={handleSend} className="space-y-4">
                                        <div>
                                            <label className="block text-xs uppercase tracking-wider text-foreground/60 mb-1 pixel-text">Recipient Address</label>
                                            <input
                                                type="text"
                                                placeholder="0x..."
                                                value={recipient}
                                                onChange={(e) => setRecipient(e.target.value)}
                                                className="w-full bg-black border border-primary/50 p-2 text-foreground focus:outline-none focus:border-primary font-mono text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase tracking-wider text-foreground/60 mb-1 pixel-text">Amount</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    step="0.000001"
                                                    placeholder="0.00"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                    className="w-full bg-black border border-primary/50 p-2 text-foreground focus:outline-none focus:border-primary font-mono text-sm"
                                                />
                                                <select
                                                    value={selectedToken}
                                                    onChange={(e) => setSelectedToken(e.target.value)}
                                                    className="bg-black border border-primary/50 text-foreground p-2 text-sm focus:outline-none"
                                                >
                                                    <option value="ETH">ETH</option>
                                                    <option value="USDC">USDC</option>
                                                    <option value="PYUSD">PYUSD</option>
                                                    <option value="LINK">LINK</option>
                                                </select>
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="p-3 bg-red-500/10 border border-red-500 text-red-500 text-xs pixel-text">
                                                {error}
                                            </div>
                                        )}

                                        {txHash && (
                                            <div className="p-3 bg-green-500/10 border border-green-500 text-green-500 text-xs pixel-text break-all">
                                                Sent! Tx: {txHash}
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={isSending || !amount || !recipient}
                                            className="w-full py-3 bg-primary text-black font-bold pixel-text hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2"
                                        >
                                            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            SEND_ASSETS
                                        </button>
                                    </form>
                                )}

                                {/* RECEIVE TAB */}
                                {activeTab === 'receive' && (
                                    <div className="flex flex-col items-center text-center space-y-6 py-4">
                                        <div>
                                            <p className="text-xs text-foreground/60 pixel-text mb-2">YOUR_QUANTUM_ADDRESS</p>
                                            <p className="font-mono text-xs text-primary break-all bg-primary/5 p-2 border border-primary/20">
                                                {accountAddress || "Loading..."}
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleCopyAddress}
                                            className="px-4 py-2 border border-primary text-primary hover:bg-primary hover:text-black transition pixel-text text-xs flex items-center gap-2"
                                        >
                                            <Copy className="w-3 h-3" /> COPY_ADDRESS
                                        </button>
                                    </div>
                                )}

                                {/* DEPOSIT TAB */}
                                {activeTab === 'deposit' && (
                                    <div className="space-y-4">
                                        <div className="p-3 border border-primary/30 bg-primary/5">
                                            <p className="text-xs text-foreground/80 pixel-text">
                                                Transfer assets from your external wallet (EOA) to your Quantum Account.
                                            </p>
                                        </div>

                                        {!isEoaConnected ? (
                                            <div className="text-center py-4">
                                                <p className="text-red-500 text-sm pixel-text mb-2">EOA Not Connected</p>
                                                <p className="text-xs text-foreground/50">Please connect your standard MetaMask wallet using the button in the header first.</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <div className="flex justify-between text-xs text-foreground/60 mb-1 pixel-text">
                                                        <span>Amount to Deposit</span>
                                                        <span>Bal: {getFormattedBalance()} {selectedToken}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="number"
                                                            step="0.000001"
                                                            placeholder="0.00"
                                                            value={amount}
                                                            onChange={(e) => setAmount(e.target.value)}
                                                            className="w-full bg-black border border-primary/50 p-2 text-foreground focus:outline-none focus:border-primary font-mono text-sm"
                                                        />
                                                        <select
                                                            value={selectedToken}
                                                            onChange={(e) => setSelectedToken(e.target.value)}
                                                            className="bg-black border border-primary/50 text-foreground p-2 text-sm focus:outline-none max-w-[100px]"
                                                        >
                                                            <option value="ETH">ETH</option>
                                                            <option value="USDC">USDC</option>
                                                            <option value="PYUSD">PYUSD</option>
                                                            <option value="LINK">LINK</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {error && (
                                                    <div className="p-3 bg-red-500/10 border border-red-500 text-red-500 text-xs pixel-text break-words">
                                                        {error}
                                                    </div>
                                                )}

                                                {(ethTxHash || erc20TxHash) && (
                                                    <div className="p-3 bg-green-500/10 border border-green-500 text-green-500 text-xs pixel-text break-all">
                                                        Sent! Hash: {ethTxHash || erc20TxHash}
                                                    </div>
                                                )}

                                                <button
                                                    onClick={handleDeposit}
                                                    disabled={isPending || !amount}
                                                    className="w-full py-3 bg-white text-black font-bold pixel-text hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2"
                                                >
                                                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownLeft className="w-4 h-4" />}
                                                    {isPending ? 'CONFIRMING...' : 'DEPOSIT_ASSETS'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
