import { Loader2, CheckCircle, XCircle, ExternalLink, Clock } from "lucide-react";

export interface PoolCreationStep {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'active' | 'complete' | 'error';
    txHash?: string;
}

interface PoolCreationModalProps {
    isOpen: boolean;
    steps: PoolCreationStep[];
    currentStepIndex: number;
    error?: string | null;
    onClose?: () => void;
    canClose?: boolean;
}

export default function PoolCreationModal({
    isOpen,
    steps,
    currentStepIndex,
    error,
    onClose,
    canClose = false,
}: PoolCreationModalProps) {
    if (!isOpen) return null;

    const getStepIcon = (step: PoolCreationStep, index: number) => {
        switch (step.status) {
            case 'complete':
                return <CheckCircle className="w-6 h-6 text-green-500" />;
            case 'active':
                return <Loader2 className="w-6 h-6 text-primary animate-spin" />;
            case 'error':
                return <XCircle className="w-6 h-6 text-red-500" />;
            default:
                return (
                    <div className="w-6 h-6 border-2 border-primary/30 rounded-full flex items-center justify-center">
                        <span className="text-xs text-foreground/40">{index + 1}</span>
                    </div>
                );
        }
    };

    const getStepBorderColor = (status: PoolCreationStep['status']) => {
        switch (status) {
            case 'complete':
                return 'border-green-500';
            case 'active':
                return 'border-primary';
            case 'error':
                return 'border-red-500';
            default:
                return 'border-primary/30';
        }
    };

    const allComplete = steps.every((s) => s.status === 'complete');
    const hasError = steps.some((s) => s.status === 'error') || !!error;

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-black border-2 border-primary max-w-lg w-full p-6 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        {allComplete ? (
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        ) : hasError ? (
                            <XCircle className="w-8 h-8 text-red-500" />
                        ) : (
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        )}
                        <h2 className="text-xl md:text-2xl font-bold pixel-text text-foreground">
                            {allComplete
                                ? "POOL_CREATED"
                                : hasError
                                    ? "CREATION_FAILED"
                                    : "CREATING_POOL"}
                        </h2>
                    </div>
                    {canClose && onClose && (
                        <button
                            onClick={onClose}
                            className="text-foreground/40 hover:text-foreground transition"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Progress Indicator */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-foreground/60 pixel-text">PROGRESS</span>
                        <span className="text-xs text-foreground/60 pixel-text">
                            {steps.filter((s) => s.status === 'complete').length}/{steps.length}
                        </span>
                    </div>
                    <div className="h-2 bg-primary/20 overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{
                                width: `${(steps.filter((s) => s.status === 'complete').length / steps.length) * 100}%`,
                            }}
                        />
                    </div>
                </div>

                {/* Steps List */}
                <div className="space-y-3 mb-6">
                    {steps.map((step, index) => (
                        <div
                            key={step.id}
                            className={`p-4 border-2 ${getStepBorderColor(step.status)} bg-black/50 transition-all`}
                        >
                            <div className="flex items-start gap-3">
                                {getStepIcon(step, index)}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-foreground pixel-text text-sm">
                                            {step.title}
                                        </h3>
                                        {step.status === 'active' && (
                                            <span className="text-xs text-primary pixel-text animate-pulse">
                                                IN_PROGRESS
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-foreground/60 pixel-text mt-1">
                                        {step.description}
                                    </p>
                                    {step.txHash && (
                                        <a
                                            href={`https://sepolia.etherscan.io/tx/${step.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-2 pixel-text"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            {step.txHash.slice(0, 10)}...{step.txHash.slice(-6)}
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Error Display */}
                {error && (
                    <div className="p-4 border-2 border-red-500 bg-red-500/10 mb-6">
                        <p className="text-red-500 text-sm pixel-text break-words">{error}</p>
                    </div>
                )}

                {/* Footer Info */}
                {!allComplete && !hasError && (
                    <div className="p-3 border border-primary/30 bg-primary/5">
                        <div className="flex items-center gap-2 text-foreground/60">
                            <Clock className="w-4 h-4" />
                            <p className="text-xs pixel-text">
                                Each step requires blockchain confirmation. Please wait...
                            </p>
                        </div>
                    </div>
                )}

                {allComplete && (
                    <div className="text-center">
                        <p className="text-green-500 pixel-text mb-4">
                            ✓ Pool created and liquidity added successfully!
                        </p>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-primary text-black font-bold pixel-text hover:bg-white transition"
                            >
                                VIEW_POOLS
                            </button>
                        )}
                    </div>
                )}

                {hasError && onClose && (
                    <div className="text-center">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border-2 border-primary text-primary font-bold pixel-text hover:bg-primary hover:text-black transition"
                        >
                            TRY_AGAIN
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
