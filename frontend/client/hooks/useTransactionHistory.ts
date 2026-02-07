import { useState, useEffect, useCallback } from "react";

export type TransactionType = "swap" | "add_liquidity" | "remove_liquidity" | "approve" | "create_pool";

export interface Transaction {
    id: string;
    type: TransactionType;
    txHash: string;
    timestamp: number;
    status: "pending" | "confirmed" | "failed";
    details: {
        fromToken?: string;
        toToken?: string;
        fromAmount?: string;
        toAmount?: string;
        lpAmount?: string;
        poolId?: string;
    };
}

const STORAGE_KEY = "quantum_transactions";
const MAX_TRANSACTIONS = 50;

function loadTransactions(): Transaction[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to load transactions:", e);
    }
    return [];
}

function saveTransactions(transactions: Transaction[]): void {
    try {
        // Keep only the most recent transactions
        const trimmed = transactions.slice(0, MAX_TRANSACTIONS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
        console.error("Failed to save transactions:", e);
    }
}

export function useTransactionHistory() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    // Load transactions on mount
    useEffect(() => {
        setTransactions(loadTransactions());
    }, []);

    // Add a new transaction
    const addTransaction = useCallback((
        type: TransactionType,
        txHash: string,
        details: Transaction["details"] = {}
    ): Transaction => {
        const newTx: Transaction = {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type,
            txHash,
            timestamp: Date.now(),
            status: "confirmed",
            details,
        };

        setTransactions((prev) => {
            const updated = [newTx, ...prev];
            saveTransactions(updated);
            return updated;
        });

        return newTx;
    }, []);

    // Update transaction status
    const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
        setTransactions((prev) => {
            const updated = prev.map((tx) =>
                tx.id === id ? { ...tx, ...updates } : tx
            );
            saveTransactions(updated);
            return updated;
        });
    }, []);

    // Clear all transactions
    const clearTransactions = useCallback(() => {
        setTransactions([]);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    // Get recent transactions (last N)
    const getRecentTransactions = useCallback((count: number = 10): Transaction[] => {
        return transactions.slice(0, count);
    }, [transactions]);

    // Format timestamp to relative time
    const formatTime = useCallback((timestamp: number): string => {
        const now = Date.now();
        const diff = now - timestamp;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;

        return new Date(timestamp).toLocaleDateString();
    }, []);

    // Get type label
    const getTypeLabel = useCallback((type: TransactionType): string => {
        const labels: Record<TransactionType, string> = {
            swap: "Swap",
            add_liquidity: "Add Liquidity",
            remove_liquidity: "Remove Liquidity",
            approve: "Approve",
            create_pool: "Create Pool",
        };
        return labels[type];
    }, []);

    return {
        transactions,
        addTransaction,
        updateTransaction,
        clearTransactions,
        getRecentTransactions,
        formatTime,
        getTypeLabel,
    };
}
