import { CheckCircle, ExternalLink, X } from "lucide-react";
import { useEffect } from "react";

export type TransactionType = "swap" | "add_liquidity" | "remove_liquidity" | "approve" | "create_pool";

export interface TransactionSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: TransactionType;
    txHash: string;
    details?: {
        fromToken?: string;
        toToken?: string;
        fromAmount?: string;
        toAmount?: string;
        lpAmount?: string;
    };
}

const TYPE_LABELS: Record<TransactionType, string> = {
    swap: "SWAP_COMPLETE",
    add_liquidity: "LIQUIDITY_ADDED",
    remove_liquidity: "LIQUIDITY_REMOVED",
    approve: "APPROVAL_COMPLETE",
    create_pool: "POOL_CREATED",
};

const TYPE_DESCRIPTIONS: Record<TransactionType, string> = {
    swap: "Your token swap has been executed successfully!",
    add_liquidity: "You have successfully added liquidity to the pool!",
    remove_liquidity: "You have successfully removed liquidity from the pool!",
    approve: "Token approval has been granted successfully!",
    create_pool: "Your new pool has been created successfully!",
};

export default function TransactionSuccessModal({
    isOpen,
    onClose,
    type,
    txHash,
    details,
}: TransactionSuccessModalProps) {
    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
        }
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const etherscanUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
    const shortHash = txHash ? `${txHash.slice(0, 10)}...${txHash.slice(-8)}` : "";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-md mx-4 border-2 border-primary bg-black p-6 animate-in fade-in zoom-in duration-200">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-foreground/60 hover:text-foreground transition"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Success Icon */}
                <div className="flex justify-center mb-6">
                    <div className="p-4 border-2 border-primary bg-primary/10 animate-pulse">
                        <CheckCircle className="w-12 h-12 text-primary" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-primary text-center mb-2 pixel-text">
                    {TYPE_LABELS[type]}
                </h2>
                <p className="text-foreground/60 text-center mb-6 pixel-text text-sm">
                    {TYPE_DESCRIPTIONS[type]}
                </p>

                {/* Transaction Details */}
                {details && (
                    <div className="space-y-3 mb-6 p-4 border border-primary/30 bg-primary/5">
                        {type === "swap" && details.fromToken && details.toToken && (
                            <>
                                <div className="flex justify-between text-sm pixel-text">
                                    <span className="text-foreground/60">From</span>
                                    <span className="text-foreground">{details.fromAmount} {details.fromToken}</span>
                                </div>
                                <div className="flex justify-center">
                                    <span className="text-primary">↓</span>
                                </div>
                                <div className="flex justify-between text-sm pixel-text">
                                    <span className="text-foreground/60">To</span>
                                    <span className="text-primary font-bold">{details.toAmount} {details.toToken}</span>
                                </div>
                            </>
                        )}

                        {(type === "add_liquidity" || type === "remove_liquidity") && (
                            <>
                                {details.fromAmount && details.fromToken && (
                                    <div className="flex justify-between text-sm pixel-text">
                                        <span className="text-foreground/60">{details.fromToken}</span>
                                        <span className="text-foreground">{details.fromAmount}</span>
                                    </div>
                                )}
                                {details.toAmount && details.toToken && (
                                    <div className="flex justify-between text-sm pixel-text">
                                        <span className="text-foreground/60">{details.toToken}</span>
                                        <span className="text-foreground">{details.toAmount}</span>
                                    </div>
                                )}
                                {details.lpAmount && (
                                    <div className="flex justify-between text-sm pixel-text border-t border-primary/30 pt-2 mt-2">
                                        <span className="text-foreground/60">LP Tokens</span>
                                        <span className="text-primary font-bold">{details.lpAmount}</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Transaction Hash */}
                <div className="mb-6">
                    <p className="text-xs text-foreground/40 mb-1 pixel-text">TRANSACTION_HASH</p>
                    <a
                        href={etherscanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 border border-primary/30 hover:border-primary hover:bg-primary/5 transition group"
                    >
                        <code className="text-sm text-foreground/80">{shortHash}</code>
                        <ExternalLink className="w-4 h-4 text-primary group-hover:scale-110 transition" />
                    </a>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="w-full py-3 border-2 border-primary text-primary hover:bg-primary hover:text-black font-bold transition-all pixel-text"
                >
                    CLOSE
                </button>
            </div>
        </div>
    );
}
