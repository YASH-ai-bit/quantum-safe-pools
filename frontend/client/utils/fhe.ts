/**
 * FHE (Fully Homomorph Encryption) utilities for dark pool operations
 * These functions handle encryption/decryption of amounts for private trading
 */

import { createInstance, FhevmInstance } from "fhevmjs";

let fheInstanceCache: FhevmInstance | null = null;

/**
 * Initialize FHE instance for encryption/decryption
 * @param chainId - Network chain ID
 * @param publicKey - FHE public key from contract
 */
export async function initFHEInstance(
  chainId: number,
  publicKey: string,
): Promise<FhevmInstance> {
  if (fheInstanceCache) {
    return fheInstanceCache;
  }

  const instance = await createInstance({
    chainId,
    publicKey,
    gatewayUrl: getFHEGatewayUrl(chainId),
  });

  fheInstanceCache = instance;
  return instance;
}

/**
 * Get FHE gateway URL for chain
 */
function getFHEGatewayUrl(chainId: number): string {
  // Update these URLs based on your FHE provider (Zama, Inco, etc.)
  const gateways: Record<number, string> = {
    11155111: "https://gateway.fhevm.io", // Sepolia
    31337: "http://localhost:8545", // Local
  };

  return gateways[chainId] || "https://gateway.fhevm.io";
}

/**
 * Encrypt a numeric value for FHE operations
 * @param instance - FHE instance
 * @param value - Value to encrypt (as bigint)
 * @returns Encrypted value and proof
 */
export async function encryptAmount(
  instance: FhevmInstance,
  value: bigint,
): Promise<{ encrypted: Uint8Array; proof: Uint8Array }> {
  const encrypted = instance.encrypt64(value);
  const proof = instance.generateProof(encrypted);

  return { encrypted, proof };
}

/**
 * Decrypt an encrypted value from FHE
 * @param instance - FHE instance
 * @param encryptedData - Encrypted data bytes
 * @param privateKey - User's FHE private key
 * @returns Decrypted value as bigint
 */
export async function decryptAmount(
  instance: FhevmInstance,
  encryptedData: Uint8Array,
  privateKey: string,
): Promise<bigint> {
  return instance.decrypt(encryptedData, privateKey);
}

/**
 * Encrypt multiple amounts (for add liquidity)
 */
export async function encryptMultipleAmounts(
  instance: FhevmInstance,
  amounts: bigint[],
): Promise<{ encrypted: Uint8Array[]; proofs: Uint8Array[] }> {
  const encrypted: Uint8Array[] = [];
  const proofs: Uint8Array[] = [];

  for (const amount of amounts) {
    const result = await encryptAmount(instance, amount);
    encrypted.push(result.encrypted);
    proofs.push(result.proof);
  }

  return { encrypted, proofs };
}

/**
 * Combine multiple proofs into single proof data
 */
export function combineProofs(proofs: Uint8Array[]): Uint8Array {
  // Calculate total length
  const totalLength = proofs.reduce((sum, proof) => sum + proof.length, 0);

  // Create combined array
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  for (const proof of proofs) {
    combined.set(proof, offset);
    offset += proof.length;
  }

  return combined;
}

/**
 * Convert Uint8Array to hex string for contract calls
 */
export function toHexString(arr: Uint8Array): string {
  return (
    "0x" +
    Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Convert hex string back to Uint8Array
 */
export function fromHexString(hex: string): Uint8Array {
  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  const arr = new Uint8Array(cleaned.length / 2);

  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }

  return arr;
}

/**
 * Estimate FHE gas cost multiplier
 * FHE operations are significantly more expensive than normal operations
 */
export function estimateFHEGasMultiplier(
  operation: "swap" | "addLiquidity" | "removeLiquidity",
): number {
  const multipliers = {
    swap: 60,
    addLiquidity: 70,
    removeLiquidity: 65,
  };

  return multipliers[operation];
}

/**
 * Calculate estimated gas cost in USD for FHE operation
 */
export function estimateFHEGasCost(
  operation: "swap" | "addLiquidity" | "removeLiquidity",
  normalGasEstimate: bigint,
  gasPriceGwei: number,
  ethPriceUSD: number,
): number {
  const multiplier = estimateFHEGasMultiplier(operation);
  const fheGas = Number(normalGasEstimate) * multiplier;
  const costWei = fheGas * gasPriceGwei * 1e9;
  const costETH = costWei / 1e18;
  const costUSD = costETH * ethPriceUSD;

  return costUSD;
}

/**
 * Check if FHE is available/supported
 */
export function isFHESupported(): boolean {
  // Check if fhevmjs is available
  try {
    return typeof createInstance === "function";
  } catch {
    return false;
  }
}

/**
 * Get FHE public key from smart contract
 * This should be called to initialize the FHE instance
 */
export async function getFHEPublicKeyFromContract(
  factoryAddress: string,
  provider: any,
): Promise<string> {
  // In a real implementation, this would call a contract method
  // For now, return a placeholder
  // TODO: Implement actual contract call
  return "0x..."; // Placeholder
}

/**
 * Helper to encrypt swap parameters
 */
export async function encryptSwapParams(
  instance: FhevmInstance,
  amountIn: bigint,
  minAmountOut: bigint,
) {
  const [encAmountIn, encMinOut] = await Promise.all([
    encryptAmount(instance, amountIn),
    encryptAmount(instance, minAmountOut),
  ]);

  return {
    encryptedAmountIn: toHexString(encAmountIn.encrypted),
    encryptedMinAmountOut: toHexString(encMinOut.encrypted),
    proof: toHexString(combineProofs([encAmountIn.proof, encMinOut.proof])),
  };
}

/**
 * Helper to encrypt liquidity parameters
 */
export async function encryptLiquidityParams(
  instance: FhevmInstance,
  amount0: bigint,
  amount1: bigint,
  minLiquidity: bigint,
) {
  const [enc0, enc1, encMin] = await Promise.all([
    encryptAmount(instance, amount0),
    encryptAmount(instance, amount1),
    encryptAmount(instance, minLiquidity),
  ]);

  return {
    encryptedAmount0: toHexString(enc0.encrypted),
    encryptedAmount1: toHexString(enc1.encrypted),
    encryptedMinLiquidity: toHexString(encMin.encrypted),
    proof: toHexString(combineProofs([enc0.proof, enc1.proof, encMin.proof])),
  };
}

/**
 * Clear FHE instance cache (useful for network changes)
 */
export function clearFHECache() {
  fheInstanceCache = null;
}
