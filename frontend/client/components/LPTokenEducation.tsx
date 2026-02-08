import React from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Info, TrendingUp, AlertTriangle } from "lucide-react";

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
                        Think of them as your pool membership card
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2">The Simple Explanation</h3>
                        <p className="text-sm text-muted-foreground">
                            When you add your tokens to a pool, you get LP (Liquidity Provider) tokens back.
                            These act like a receipt that proves how much of the pool you own.
                            You can return them anytime to get your original tokens back, plus any trading fees you've earned!
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            How It Works
                        </h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>• You add tokens to the pool (e.g., 100 USDC + 100 PYUSD)</li>
                            <li>• You receive LP tokens that represent your share</li>
                            <li>• Your LP tokens earn fees from every trade</li>
                            <li>• Return your LP tokens to withdraw your share + earnings</li>
                        </ul>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                                    Things to Know
                                </h3>
                                <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                                    <li>
                                        • <strong>Earn Fees:</strong> You automatically earn a share of trading fees as long as your tokens are in the pool
                                    </li>
                                    <li>
                                        • <strong>Price Changes:</strong> If token prices change a lot, you might get back different amounts than you put in (but fees help offset this)
                                    </li>
                                    <li>
                                        • <strong>Special Discount:</strong> Quantum Safe users pay only 0.1% fees instead of 0.3%
                                    </li>
                                    <li>
                                        • <strong>Your Share:</strong> The more LP tokens you have, the bigger your share of the pool and its fees
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">Example</h3>
                        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm space-y-1">
                            <p>
                                <strong>You add:</strong> 100 USDC + 100 PYUSD to the pool
                            </p>
                            <p className="text-green-600 dark:text-green-400">
                                <strong>You receive:</strong> LP tokens worth ~$200
                            </p>
                            <p className="text-muted-foreground text-xs mt-2">
                                Your LP tokens represent your share of the pool. If you're the first person, you own almost 100% of it!
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
