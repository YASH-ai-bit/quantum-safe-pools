import { useState, useEffect, useCallback } from 'react';
import { CONTRACTS } from '@shared/contracts';

// ABI for Quantum Registry (minimal, add more as needed)
const REGISTRY_ABI = [
  'function isQuantumSafe(address user) external view returns (bool)',
  'function getUserKeyHash(address user) external view returns (bytes32)',
  'function register(bytes32 publicKeyHash) external',
  'function totalRegistered() external view returns (uint256)',
];

// Helper to get Flask provider specifically
function getFlaskProvider() {
  const { ethereum } = window as any;

  if (!ethereum) {
    return null;
  }

  // If multiple providers exist, find Flask specifically
  if (ethereum.providers?.length) {
    const flaskProvider = ethereum.providers.find((provider: any) =>
      provider.isMetaMask && provider.isFlask
    );

    if (flaskProvider) {
      return flaskProvider;
    }

    // Fallback: try the first MetaMask that supports snaps
    const mmProvider = ethereum.providers.find((p: any) => p.isMetaMask);
    return mmProvider || ethereum.providers[0];
  }

  // Single provider - could be Flask
  return ethereum;
}

export function useQuantumRegistry() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to check if Flask is available
  const isFlaskAvailable = async (): Promise<boolean> => {
    const provider = getFlaskProvider();
    if (!provider) return false;

    try {
      await provider.request({ method: 'wallet_getSnaps' });
      return true;
    } catch {
      return false;
    }
  };

  // Check if an address is quantum-safe
  const checkQuantumSafe = useCallback(async (address: string): Promise<boolean> => {
    // Validate address format
    if (!address ||
      address === '0x' ||
      address === '0x0000000000000000000000000000000000000000' ||
      address.length < 42 ||
      !address.startsWith('0x')) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Using ethers v6 syntax - Read-only, no connection needed
      const { ethers } = await import('ethers');
      const flaskProvider = getFlaskProvider();
      if (!flaskProvider) {
        throw new Error('MetaMask Flask not found');
      }
      const provider = new ethers.BrowserProvider(flaskProvider, 'any');

      const registry = new ethers.Contract(
        CONTRACTS.QUANTUM_REGISTRY,
        REGISTRY_ABI,
        provider
      );

      const isQuantumSafe = await registry.getFunction('isQuantumSafe').staticCall(address);
      setIsLoading(false);
      return isQuantumSafe;
    } catch (err: any) {
      console.error('Error checking quantum status:', err);
      setError(err?.message || 'Failed to check quantum status');
      setIsLoading(false);
      return false;
    }
  }, []);

  // Register a quantum public key hash
  const register = useCallback(async (publicKeyHash: string) => {
    // Check if Flask is available before proceeding
    const flaskAvailable = await isFlaskAvailable();
    if (!flaskAvailable) {
      throw new Error('MetaMask Flask is required for registration');
    }

    setIsLoading(true);
    setError(null);

    try {
      const { ethers } = await import('ethers');
      const flaskProvider = getFlaskProvider();
      if (!flaskProvider) {
        throw new Error('MetaMask Flask not found');
      }
      const provider = new ethers.BrowserProvider(flaskProvider, 'any');
      const signer = await provider.getSigner();

      const registry = new ethers.Contract(
        CONTRACTS.QUANTUM_REGISTRY,
        REGISTRY_ABI,
        signer
      );

      // Convert hex string to bytes32
      // Remove '0x' prefix if present and ensure it's 64 hex chars (32 bytes)
      const cleanHash = publicKeyHash.startsWith('0x')
        ? publicKeyHash.slice(2)
        : publicKeyHash;

      // Pad to 64 hex characters (32 bytes)
      const paddedHash = cleanHash.padStart(64, '0').slice(0, 64);
      const bytes32Hash = '0x' + paddedHash;

      const tx = await registry.register(bytes32Hash);
      await tx.wait();

      setIsLoading(false);
      return tx.hash;
    } catch (err: any) {
      console.error('Error registering:', err);
      setError(err?.message || 'Failed to register');
      setIsLoading(false);
      throw err;
    }
  }, []);

  // Get total registered users
  const getTotalRegistered = useCallback(async (): Promise<number> => {
    try {
      const { ethers } = await import('ethers');
      const flaskProvider = getFlaskProvider();
      if (!flaskProvider) {
        return 0;
      }
      const provider = new ethers.BrowserProvider(flaskProvider, 'any');

      const registry = new ethers.Contract(
        CONTRACTS.QUANTUM_REGISTRY,
        REGISTRY_ABI,
        provider
      );

      const total = await registry.totalRegistered();
      return Number(total);
    } catch (err) {
      console.error('Error getting total registered:', err);
      return 0;
    }
  }, []);

  // Batch check multiple addresses
  const batchCheckQuantumSafe = useCallback(async (addresses: string[]): Promise<boolean[]> => {
    try {
      const results = await Promise.all(
        addresses.map(addr => checkQuantumSafe(addr))
      );
      return results;
    } catch (err) {
      console.error('Error batch checking:', err);
      return addresses.map(() => false);
    }
  }, [checkQuantumSafe]);

  return {
    checkQuantumSafe,
    register,
    getTotalRegistered,
    batchCheckQuantumSafe,
    isLoading,
    error,
  };
}
