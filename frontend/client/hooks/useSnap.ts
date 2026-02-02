import { useState, useEffect, useCallback } from 'react';
import { RPC_URLS, CHAIN_ID, CONTRACTS } from '@shared/contracts';

const SNAP_ID = 'local:http://localhost:8080'; // Update with deployed snap ID
const DISCONNECTED_KEY = 'quantum_snap_disconnected'; // localStorage key

interface SnapState {
  isFlask: boolean;
  isInstalled: boolean;
  isConnected: boolean;
  publicKey: string | null;
  publicKeyHash: string | null;
  accountAddress: string | null;
}

// Helper to get Flask provider specifically
function getFlaskProvider() {
  const { ethereum } = window as any;
  
  if (!ethereum) {
    console.log('No ethereum provider found');
    return null;
  }

  // If multiple providers exist, find Flask specifically
  if (ethereum.providers?.length) {
    console.log('Multiple providers detected:', ethereum.providers.length);
    const flaskProvider = ethereum.providers.find((provider: any) => {
      console.log('Checking provider:', { isMetaMask: provider.isMetaMask, isFlask: provider.isFlask });
      return provider.isMetaMask && provider.isFlask;
    });
    
    if (flaskProvider) {
      console.log('✅ Flask provider found in providers array');
      return flaskProvider;
    }
    
    // Fallback: if no Flask flag, try the first MetaMask that supports snaps
    const mmProvider = ethereum.providers.find((p: any) => p.isMetaMask);
    console.log('Trying fallback MetaMask provider');
    return mmProvider || ethereum.providers[0];
  }

  // Single provider - could be Flask
  console.log('Single provider detected:', { isMetaMask: ethereum.isMetaMask, isFlask: ethereum.isFlask });
  return ethereum;
}

export function useSnap() {
  const [snapState, setSnapState] = useState<SnapState>({
    isFlask: false,
    isInstalled: false,
    isConnected: false,
    publicKey: null,
    publicKeyHash: null,
    accountAddress: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if MetaMask Flask is installed
  useEffect(() => {
    const checkFlask = async () => {
      console.log('🔍 Checking for Flask...');
      const provider = getFlaskProvider();
      
      if (!provider) {
        console.log('❌ No provider found');
        setSnapState((prev) => ({ ...prev, isFlask: false }));
        return;
      }

      try {
        console.log('📡 Testing wallet_getSnaps method...');
        // Try to call wallet_getSnaps - this method only exists in Flask
        const snaps = await provider.request({
          method: 'wallet_getSnaps',
        });

        // If we get here, Flask is installed
        console.log('✅ Flask detected! Snaps:', snaps);
        setSnapState((prev) => ({ ...prev, isFlask: true }));
        await checkSnapInstalled();
      } catch (err: any) {
        // If this fails, Flask is not installed
        console.log('❌ Flask not detected. Error:', err.message || err);
        setSnapState((prev) => ({ ...prev, isFlask: false }));
      }
    };

    checkFlask();
    
    // Also listen for account changes to re-check
    const handleAccountsChanged = () => {
      checkFlask();
    };
    
    const provider = getFlaskProvider();
    if (provider) {
      provider.on('accountsChanged', handleAccountsChanged);
    }
    
    return () => {
      if (provider) {
        provider.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  // Check if snap is already installed
  const checkSnapInstalled = async () => {
    try {
      const provider = getFlaskProvider();
      if (!provider) return;

      const snaps = await provider.request({
        method: 'wallet_getSnaps',
      });

      const isInstalled = !!snaps[SNAP_ID];
      
      // Check if user has explicitly disconnected
      const isDisconnected = localStorage.getItem(DISCONNECTED_KEY) === 'true';
      
      setSnapState((prev) => ({ 
        ...prev, 
        isInstalled,
        // Only auto-connect if snap is installed AND user hasn't disconnected
        isConnected: isInstalled && !isDisconnected
      }));

      // Only load data if connected (not disconnected)
      if (isInstalled && !isDisconnected) {
        await loadSnapData();
      }
    } catch (err) {
      console.error('Error checking snap:', err);
    }
  };

  // Install and connect to snap
  const connectSnap = useCallback(async () => {
    const provider = getFlaskProvider();
    if (!provider || !snapState.isFlask) {
      setError('Please install MetaMask Flask');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await provider.request({
        method: 'wallet_requestSnaps',
        params: {
          [SNAP_ID]: {},
        },
      });

      await initializeSnap();
      await loadSnapData();

      // Clear disconnected flag when user explicitly connects
      localStorage.removeItem(DISCONNECTED_KEY);

      setSnapState((prev) => ({ 
        ...prev, 
        isInstalled: true, 
        isConnected: true 
      }));

      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Error connecting snap:', err);
      setError(err?.message || 'Failed to connect snap');
      setLoading(false);
      return false;
    }
  }, [snapState.isFlask]);

  // Initialize quantum keys in snap
  const initializeSnap = async () => {
    try {
      const provider = getFlaskProvider();
      if (!provider) throw new Error('Flask provider not found');

      await provider.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: SNAP_ID,
          request: {
            method: 'quantum_initialize',
          },
        },
      });
    } catch (err) {
      console.error('Error initializing snap:', err);
      throw err;
    }
  };

  // Load snap data
  const loadSnapData = async () => {
    try {
      const provider = getFlaskProvider();
      if (!provider) return;

      const publicKeyData = await provider.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: SNAP_ID,
          request: {
            method: 'quantum_getPublicKey',
          },
        },
      });

      // Get account address (optional - may fail if keys not initialized)
      let accountAddress = null;
      try {
        const accountData = await provider.request({
          method: 'wallet_invokeSnap',
          params: {
            snapId: SNAP_ID,
            request: {
              method: 'quantum_getAccountAddress',
            params: {
              factoryAddress: CONTRACTS.QUANTUM_ACCOUNT_FACTORY,
              rpcUrl: RPC_URLS.SEPOLIA,
            },
            },
          },
        });
        
        // Validate address
        const addr = accountData?.address || accountData?.accountAddress;
        if (addr && addr !== '0x' && addr.length >= 42) {
          accountAddress = addr;
        }
      } catch (err) {
        console.warn('Could not get account address (keys may not be initialized):', err);
        // This is OK - account address will be null until keys are generated
      }

      // Parse public key data
      const publicKey = publicKeyData?.publicKey?.hex || publicKeyData?.publicKey;
      const publicKeyHash = publicKeyData?.publicKey?.hash || publicKeyData?.publicKeyHash;

      setSnapState((prev) => ({
        ...prev,
        publicKey: publicKey || null,
        publicKeyHash: publicKeyHash || null,
        accountAddress: accountAddress,
      }));
    } catch (err) {
      console.error('Error loading snap data:', err);
    }
  };

  // Sign a message with quantum key
  const signMessage = async (message: string) => {
    if (!snapState.isConnected) {
      throw new Error('Snap not connected');
    }

    const provider = getFlaskProvider();
    if (!provider) throw new Error('Flask provider not found');

    try {
      const signature = await provider.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: SNAP_ID,
          request: {
            method: 'quantum_signMessage',
            params: { message },
          },
        },
      });

      return signature;
    } catch (err) {
      console.error('Error signing message:', err);
      throw err;
    }
  };

  // Send a quantum-safe transaction
  const sendTransaction = async (to: string, value: string, data: string) => {
    if (!snapState.isConnected) {
      throw new Error('Snap not connected');
    }

    const provider = getFlaskProvider();
    if (!provider) throw new Error('Flask provider not found');

    try {
      const txHash = await provider.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: SNAP_ID,
          request: {
            method: 'quantum_sendTransaction',
            params: { to, value, data },
          },
        },
      });

      return txHash;
    } catch (err) {
      console.error('Error sending transaction:', err);
      throw err;
    }
  };

  // Disconnect snap (clear state)
  const disconnectSnap = useCallback(() => {
    // Set disconnected flag to prevent auto-reconnection on page reload
    localStorage.setItem(DISCONNECTED_KEY, 'true');
    
    setSnapState({
      isFlask: snapState.isFlask,
      isInstalled: snapState.isInstalled,
      isConnected: false,
      publicKey: null,
      publicKeyHash: null,
      accountAddress: null,
    });
    setError(null);
  }, [snapState.isFlask, snapState.isInstalled]);

  return {
    ...snapState,
    loading,
    error,
    connectSnap,
    disconnectSnap,
    signMessage,
    sendTransaction,
    refreshData: loadSnapData,
  };
}
