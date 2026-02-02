import { useState, useEffect, useCallback } from 'react';

const SNAP_ID = 'local:http://localhost:8080'; // Update with deployed snap ID

interface SnapState {
  isFlask: boolean;
  isInstalled: boolean;
  isConnected: boolean;
  publicKey: string | null;
  publicKeyHash: string | null;
  accountAddress: string | null;
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
      const provider = (window as any).ethereum;
      if (!provider) {
        setSnapState((prev) => ({ ...prev, isFlask: false }));
        return;
      }

      try {
        // Try to call wallet_getSnaps - this method only exists in Flask
        await provider.request({
          method: 'wallet_getSnaps',
        });

        // If we get here, Flask is installed
        setSnapState((prev) => ({ ...prev, isFlask: true }));
        await checkSnapInstalled();
      } catch (err) {
        // If this fails, Flask is not installed
        console.log('Flask not detected:', err);
        setSnapState((prev) => ({ ...prev, isFlask: false }));
      }
    };

    checkFlask();
    
    // Also listen for account changes to re-check
    const handleAccountsChanged = () => {
      checkFlask();
    };
    
    if ((window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', handleAccountsChanged);
    }
    
    return () => {
      if ((window as any).ethereum) {
        (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  // Check if snap is already installed
  const checkSnapInstalled = async () => {
    try {
      const snaps = await (window as any).ethereum.request({
        method: 'wallet_getSnaps',
      });

      const isInstalled = !!snaps[SNAP_ID];
      setSnapState((prev) => ({ 
        ...prev, 
        isInstalled,
        isConnected: isInstalled 
      }));

      if (isInstalled) {
        await loadSnapData();
      }
    } catch (err) {
      console.error('Error checking snap:', err);
    }
  };

  // Install and connect to snap
  const connectSnap = useCallback(async () => {
    if (!snapState.isFlask) {
      setError('Please install MetaMask Flask');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await (window as any).ethereum.request({
        method: 'wallet_requestSnaps',
        params: {
          [SNAP_ID]: {},
        },
      });

      await initializeSnap();
      await loadSnapData();

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
      await (window as any).ethereum.request({
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
      const publicKeyData = await (window as any).ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: SNAP_ID,
          request: {
            method: 'quantum_getPublicKey',
          },
        },
      });

      const accountData = await (window as any).ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: SNAP_ID,
          request: {
            method: 'quantum_getAccountAddress',
            params: {
              factoryAddress: '0x805cfcecaEbe8CA2B731bCeeD79e2A98142bD5D8',
            },
          },
        },
      });

      setSnapState((prev) => ({
        ...prev,
        publicKey: publicKeyData.publicKey,
        publicKeyHash: publicKeyData.publicKeyHash,
        accountAddress: accountData.accountAddress,
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

    try {
      const signature = await (window as any).ethereum.request({
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

    try {
      const txHash = await (window as any).ethereum.request({
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
