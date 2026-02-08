import { CheckCircle2, Circle, Loader2 } from "lucide-react";

export interface BatchStep {
    label: string;
    status: "pending" | "active" | "complete";
}

interface BatchTransactionIndicatorProps {
    steps: BatchStep[];
    gasSavings?: string;
    isProcessing?: boolean;
}

export function BatchTransactionIndicator({
    steps,
    gasSavings = "30%",
    isProcessing = false,
}: BatchTransactionIndicatorProps) {
    const completedSteps = steps.filter((s) => s.status === "complete").length;
    const activeStep = steps.findIndex((s) => s.status === "active");

    return (
        <div className="batch-indicator border-2 border-yellow-500 bg-yellow-500/10 rounded-lg p-4 pixel-text">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                    <h4 className="text-lg font-bold text-yellow-500">
                        🟡 Yellow Batch Transaction
                    </h4>
                </div>
                {isProcessing && (
                    <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                )}
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex justify-between text-sm text-foreground/60 mb-1">
                    <span>
                        Step {Math.min(activeStep + 1, steps.length)} of {steps.length}
                    </span>
                    <span>{Math.round((completedSteps / steps.length) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-background/50 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-yellow-500 transition-all duration-500 ease-out"
                        style={{
                            width: `${(completedSteps / steps.length) * 100}%`,
                        }}
                    />
                </div>
            </div>

            {/* Steps */}
            <div className="space-y-2 mb-4">
                {steps.map((step, index) => (
                    <div
                        key={index}
                        className={`flex items-center gap-3 p-2 rounded transition-all ${step.status === "active"
                                ? "bg-yellow-500/20 border border-yellow-500/50"
                                : step.status === "complete"
                                    ? "bg-green-500/10"
                                    : "opacity-50"
                            }`}
                    >
                        {step.status === "complete" ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : step.status === "active" ? (
                            <Loader2 className="w-5 h-5 text-yellow-500 animate-spin flex-shrink-0" />
                        ) : (
                            <Circle className="w-5 h-5 text-foreground/30 flex-shrink-0" />
                        )}
                        <span
                            className={`text-sm ${step.status === "complete"
                                    ? "text-green-500"
                                    : step.status === "active"
                                        ? "text-yellow-500 font-bold"
                                        : "text-foreground/60"
                                }`}
                        >
                            {step.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-yellow-500/30">
                <div className="flex flex-col items-center p-2 bg-background/50 rounded">
                    <div className="text-2xl font-bold text-yellow-500">
                        {gasSavings}
                    </div>
                    <div className="text-xs text-foreground/60">Gas Savings</div>
                </div>
                <div className="flex flex-col items-center p-2 bg-background/50 rounded">
                    <div className="text-2xl font-bold text-yellow-500">1x</div>
                    <div className="text-xs text-foreground/60">Signature</div>
                </div>
            </div>

            {/* Info */}
            <div className="mt-3 pt-3 border-t border-yellow-500/30">
                <p className="text-xs text-foreground/60 text-center">
                    All operations batched into a single atomic transaction
                </p>
            </div>
        </div>
    );
}

/**
 * Compact version for showing batch status inline
 */
export function BatchBadge({
    operationCount,
    gasSavings = "30%",
}: {
    operationCount: number;
    gasSavings?: string;
}) {
    return (
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500 rounded-full text-sm">
            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
            <span className="font-bold text-yellow-500">Yellow Batch</span>
            <span className="text-foreground/60">
                {operationCount} ops • {gasSavings} saved
            </span>
        </div>
    );
}
