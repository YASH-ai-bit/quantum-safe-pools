/**
 * React hook for FHE (Fully Homomorphic Encryption) operations
 * Provides easy-to-use interface for encrypting/decrypting dark pool transactions
 */

import { useState, useEffect, useCallback } from "react";
import { useChainId, useWalletClient } from "wagmi";
import { FhevmInstance } from "fhevmjs";
import {
  initFHEInstance,
  clearFHECache,
  encryptSwapParams,
  encryptLiquidityParams,
  estimateFHEGasCost,
  isFHESupported,
} from "../utils/fhe";

interface UseFHEReturn {
  // State
  fheInstance: FhevmInstance | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // Methods
  initialize: () => Promise<void>;
  encryptForSwap: (
    amountIn: bigint,
    minAmountOut: bigint,
  ) => Promise<{
    encryptedAmountIn: string;
    encryptedMinAmountOut: string;
    proof: string;
  }>;
  encryptForLiquidity: (
    amount0: bigint,
    amount1: bigint,
    minLiquidity: bigint,
  ) => Promise<{
    encryptedAmount0: string;
    encryptedAmount1: string;
    encryptedMinLiquidity: string;
    proof: string;
  }>;
  estimateGasCost: (
    operation: "swap" | "addLiquidity" | "removeLiquidity",
    normalGasEstimate: bigint,
    gasPriceGwei: number,
    ethPriceUSD: number,
  ) => number;

  // Utility
  isSupported: boolean;
}

export function useFHE(): UseFHEReturn {
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();

  const [fheInstance, setFheInstance] = useState<FhevmInstance | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported = isFHESupported();

  // Clear cache on network change
  useEffect(() => {
    clearFHECache();
    setFheInstance(null);
    setIsInitialized(false);
  }, [chainId]);

  /**
   * Initialize FHE instance with public key from contract
   */
  const initialize = useCallback(async () => {
    if (!isSupported) {
      setError("FHE not supported. Please install fhevmjs.");
      return;
    }

    if (isInitialized && fheInstance) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Get actual public key from QuantumAMMFactory contract
      // For now, using a placeholder
      const publicKey = await getFHEPublicKey();

      const instance = await initFHEInstance(chainId, publicKey);
      setFheInstance(instance);
      setIsInitialized(true);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to initialize FHE";
      setError(errorMsg);
      console.error("FHE initialization error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [chainId, isSupported, isInitialized, fheInstance]);

  /**
   * Auto-initialize when wallet connects
   */
  useEffect(() => {
    if (walletClient && !isInitialized && !isLoading && isSupported) {
      initialize();
    }
  }, [walletClient, isInitialized, isLoading, isSupported, initialize]);

  /**
   * Encrypt parameters for FHE swap
   */
  const encryptForSwap = useCallback(
    async (amountIn: bigint, minAmountOut: bigint) => {
      if (!fheInstance) {
        throw new Error("FHE not initialized. Call initialize() first.");
      }

      try {
        return await encryptSwapParams(fheInstance, amountIn, minAmountOut);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Encryption failed";
        setError(errorMsg);
        throw err;
      }
    },
    [fheInstance],
  );

  /**
   * Encrypt parameters for FHE liquidity operations
   */
  const encryptForLiquidity = useCallback(
    async (amount0: bigint, amount1: bigint, minLiquidity: bigint) => {
      if (!fheInstance) {
        throw new Error("FHE not initialized. Call initialize() first.");
      }

      try {
        return await encryptLiquidityParams(
          fheInstance,
          amount0,
          amount1,
          minLiquidity,
        );
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Encryption failed";
        setError(errorMsg);
        throw err;
      }
    },
    [fheInstance],
  );

  /**
   * Estimate gas cost for FHE operation
   */
  const estimateGasCost = useCallback(
    (
      operation: "swap" | "addLiquidity" | "removeLiquidity",
      normalGasEstimate: bigint,
      gasPriceGwei: number,
      ethPriceUSD: number,
    ) => {
      return estimateFHEGasCost(
        operation,
        normalGasEstimate,
        gasPriceGwei,
        ethPriceUSD,
      );
    },
    [],
  );

  return {
    fheInstance,
    isInitialized,
    isLoading,
    error,
    initialize,
    encryptForSwap,
    encryptForLiquidity,
    estimateGasCost,
    isSupported,
  };
}

/**
 * Helper to get FHE public key from contract
 * TODO: Replace with actual contract call
 */
async function getFHEPublicKey(): Promise<string> {
  // This would normally call QuantumAMMFactory.getFHEPublicKey()
  // For now, return a dummy key structure
  // The actual key would come from the fhevm precompiles

  // Placeholder - in production, this should call:
  // const contract = getContract({ address: FACTORY_ADDRESS, abi: FACTORY_ABI, client });
  // return await contract.read.getFHEPublicKey();

  return "0x" + "00".repeat(32); // Placeholder 32-byte key
}

/**
 * Hook for checking if user should use dark pool
 * Based on trade size and MEV risk
 */
export function useShouldUseDarkPool(tradeAmountUSD: number): {
  shouldUseDark: boolean;
  recommendation: "normal" | "dark" | "either";
  reason: string;
} {
  // Thresholds
  const DEFINITELY_DARK = 50000; // >$50k always recommend dark
  const DEFINITELY_NORMAL = 10000; // <$10k always recommend normal

  if (tradeAmountUSD >= DEFINITELY_DARK) {
    return {
      shouldUseDark: true,
      recommendation: "dark",
      reason:
        "Large trade with high MEV risk. Private execution strongly recommended.",
    };
  }

  if (tradeAmountUSD <= DEFINITELY_NORMAL) {
    return {
      shouldUseDark: false,
      recommendation: "normal",
      reason: "Small trade where gas cost outweighs MEV protection benefits.",
    };
  }

  return {
    shouldUseDark: false,
    recommendation: "either",
    reason: "Medium trade size. Consider your privacy needs vs gas costs.",
  };
}

/**
 * Hook for FHE gas estimation
 */
export function useFHEGasEstimate(
  operation: "swap" | "addLiquidity" | "removeLiquidity",
  normalGasEstimate?: bigint,
  gasPriceGwei?: number,
  ethPriceUSD?: number,
) {
  const [gasCostUSD, setGasCostUSD] = useState<number | null>(null);

  useEffect(() => {
    if (normalGasEstimate && gasPriceGwei && ethPriceUSD) {
      const cost = estimateFHEGasCost(
        operation,
        normalGasEstimate,
        gasPriceGwei,
        ethPriceUSD,
      );
      setGasCostUSD(cost);
    } else {
      setGasCostUSD(null);
    }
  }, [operation, normalGasEstimate, gasPriceGwei, ethPriceUSD]);

  return gasCostUSD;
}
