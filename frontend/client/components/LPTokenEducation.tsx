import React from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Info, TrendingUp, AlertTriangle, Calculator } from "lucide-react";

export function LPTokenEducation() {
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-blue-500" />
                        <CardTitle>What are LP Tokens?</CardTitle>
                    </div>
                    <CardDescription>
                        Understanding Liquidity Provider Tokens
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2">The Basics</h3>
                        <p className="text-sm text-muted-foreground">
                            LP (Liquidity Provider) tokens are ERC-20 tokens that represent
                            your share of a liquidity pool. When you provide liquidity to a
                            pool, you receive LP tokens in return. These tokens can be burned
                            (returned) to withdraw your share of the pool plus any fees
                            earned.
                        </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                        <div className="flex items-start gap-2">
                            <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                    How Are LP Tokens Calculated?
                                </h3>
                                <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                                    <div>
                                        <strong>Initial Liquidity (First Provider):</strong>
                                        <code className="block bg-white dark:bg-gray-800 p-2 mt-1 rounded text-xs">
                                            LP tokens = sqrt(amount0 × amount1) - 1000
                                        </code>
                                        <p className="text-xs mt-1 text-blue-700 dark:text-blue-300">
                                            The pool burns 1000 LP tokens initially to prevent
                                            manipulation attacks.
                                        </p>
                                    </div>

                                    <div className="mt-3">
                                        <strong>Subsequent Liquidity:</strong>
                                        <code className="block bg-white dark:bg-gray-800 p-2 mt-1 rounded text-xs">
                                            LP tokens = min(
                                            <br />
                                            &nbsp;&nbsp;(amount0 × totalSupply) / reserve0,
                                            <br />
                                            &nbsp;&nbsp;(amount1 × totalSupply) / reserve1
                                            <br />)
                                        </code>
                                        <p className="text-xs mt-1 text-blue-700 dark:text-blue-300">
                                            This ensures proportional additions maintain the pool
                                            ratio.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            Your Pool Share
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                            Your pool share represents what percentage of the pool you own:
                        </p>
                        <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs">
                            Pool Share % = (Your LP Tokens / Total LP Supply) × 100
                        </code>
                        <p className="text-xs text-muted-foreground mt-2">
                            As the only liquidity provider, you should own ~100% of the pool
                            (minus the burned minimum liquidity).
                        </p>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                                    Important Considerations
                                </h3>
                                <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
                                    <li>
                                        • <strong>Token Decimals Matter:</strong> If you provide
                                        small amounts of low-decimal tokens (e.g., 0.1 USDC with 6
                                        decimals), you may receive very few LP tokens due to the
                                        sqrt calculation.
                                    </li>
                                    <li>
                                        • <strong>Burned Minimum:</strong> The pool permanently
                                        burns 1000 LP tokens on initialization, so your share will
                                        be slightly less than 100% even as the first provider.
                                    </li>
                                    <li>
                                        • <strong>Impermanent Loss:</strong> If token prices
                                        diverge, your position may be worth less than simply holding
                                        the tokens. However, you earn trading fees to compensate.
                                    </li>
                                    <li>
                                        • <strong>Dynamic Fees:</strong> Quantum registered accounts
                                        pay 0.1% fees, while standard accounts pay 0.3%. These fees
                                        accumulate to LP token holders.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">Example Calculation</h3>
                        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm space-y-1">
                            <p className="font-mono">
                                <strong>Scenario:</strong> First liquidity provision
                            </p>
                            <p className="font-mono">Amount0: 100 USDC (100,000,000 wei)</p>
                            <p className="font-mono">Amount1: 100 PYUSD (100,000,000 wei)</p>
                            <p className="font-mono text-blue-600 dark:text-blue-400">
                                LP tokens = sqrt(100,000,000 × 100,000,000) - 1000
                            </p>
                            <p className="font-mono text-blue-600 dark:text-blue-400">
                                LP tokens = sqrt(10,000,000,000,000,000) - 1000
                            </p>
                            <p className="font-mono text-blue-600 dark:text-blue-400">
                                LP tokens = 100,000,000 - 1000
                            </p>
                            <p className="font-mono text-green-600 dark:text-green-400">
                                <strong>= 99,999,000 LP tokens</strong>
                            </p>
                            <p className="font-mono text-muted-foreground text-xs mt-2">
                                (1000 tokens burned, so total supply = 100,000,000)
                            </p>
                            <p className="font-mono text-muted-foreground text-xs">
                                Your share = 99,999,000 / 100,000,000 = 99.999%
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
