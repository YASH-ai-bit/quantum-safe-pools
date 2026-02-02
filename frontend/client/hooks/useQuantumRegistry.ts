import { useState, useEffect, useCallback } from 'react';
import { CONTRACTS } from '@shared/contracts';

// ABI for Quantum Registry (minimal, add more as needed)
const REGISTRY_ABI = [
  'function isQuantumSafe(address user) external view returns (bool)',
  'function getUserKeyHash(address user) external view returns (bytes32)',
  'function register(bytes32 publicKeyHash) external',
  'function totalRegistered() external view returns (uint256)',
];

export function useQuantumRegistry() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to check if Flask is available
  const isFlaskAvailable = async (): Promise<boolean> => {
    const provider = (window as any).ethereum;
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
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Using ethers v6 syntax - Read-only, no connection needed
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider((window as any).ethereum, 'any');
      
      const registry = new ethers.Contract(
        CONTRACTS.QUANTUM_REGISTRY,
        REGISTRY_ABI,
        provider
      );

      const isQuantumSafe = await registry.isQuantumSafe(address);
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
      const provider = new ethers.BrowserProvider((window as any).ethereum, 'any');
      const signer = await provider.getSigner();
      
      const registry = new ethers.Contract(
        CONTRACTS.QUANTUM_REGISTRY,
        REGISTRY_ABI,
        signer
      );

      const tx = await registry.register(publicKeyHash);
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
      const provider = new ethers.BrowserProvider((window as any).ethereum, 'any');
      
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
