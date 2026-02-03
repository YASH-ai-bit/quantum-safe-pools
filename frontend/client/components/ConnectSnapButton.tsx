import { useState, useEffect, useCallback } from 'react';
import { Shield, Download, Check, AlertCircle, LogOut, Zap } from 'lucide-react';
import { useSnap } from '../hooks/useSnap';
import { useQuantumRegistry } from '../hooks/useQuantumRegistry';
import QuantumSetupModal from './QuantumSetupModal';

export default function ConnectSnapButton() {
  const { isFlask, isConnected, publicKeyHash, accountAddress, loading, error, connectSnap, disconnectSnap } = useSnap();
  const { checkQuantumSafe, isLoading: checkingQS } = useQuantumRegistry();
  const [showDetails, setShowDetails] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isQuantumSafe, setIsQuantumSafe] = useState<boolean | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);

  // Get user's Ethereum address from Flask
  useEffect(() => {
    const getAddress = async () => {
      const provider = (window as any).ethereum;
      if (!provider) return;

      try {
        const flaskProvider = provider.providers?.find((p: any) => p.isMetaMask && p.isFlask) || provider;
        const accounts = await flaskProvider.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          setUserAddress(accounts[0]);
        }
      } catch (err) {
        console.error('Error getting address:', err);
      }
    };

    getAddress();
  }, [isConnected]);

  // Check if user is quantum-safe on-chain
  const refreshQuantumStatus = useCallback(async () => {
    const addressToCheck = userAddress || accountAddress;

    // Validate address format
    if (!addressToCheck ||
      addressToCheck === '0x' ||
      addressToCheck.length < 42 ||
      !addressToCheck.startsWith('0x')) {
      setIsQuantumSafe(null);
      return;
    }

    try {
      const isQS = await checkQuantumSafe(addressToCheck);
      setIsQuantumSafe(isQS);
    } catch (err) {
      console.error('Error checking quantum status:', err);
      setIsQuantumSafe(false);
    }
  }, [accountAddress, userAddress, checkQuantumSafe]);

  useEffect(() => {
    if (isConnected && (accountAddress || userAddress)) {
      refreshQuantumStatus();
    } else {
      setIsQuantumSafe(null);
    }
  }, [isConnected, accountAddress, userAddress, refreshQuantumStatus]);

  const handleConnect = async () => {
    const success = await connectSnap();
    // Don't auto-open modal - let user choose
  };

  // Not Flask - show warning
  if (!isFlask) {
    return (
      <>
        <div className="flex flex-col items-end gap-2">
          <a
            href="https://metamask.io/flask/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 border-2 border-red-500 text-red-500 hover:bg-red-500/10 transition-all pixel-text text-sm glitch-hover"
          >
            <AlertCircle className="w-4 h-4" />
            INSTALL_FLASK
          </a>
          <p className="text-xs text-red-500/60">
            MetaMask Flask not detected
          </p>
        </div>

        {/* Quantum Setup Modal */}
        <QuantumSetupModal
          isOpen={showSetupModal}
          onClose={() => setShowSetupModal(false)}
          onRegistrationComplete={() => {
            // Refresh quantum status after registration
            refreshQuantumStatus();
          }}
        />
      </>
    );
  }

  // Connected - show status based on quantum-safe status
  if (isConnected) {
    // Check if user is quantum-safe on-chain
    const isQS = isQuantumSafe === true;
    const checking = checkingQS || isQuantumSafe === null;

    return (
      <>
        <div className="flex flex-col items-end gap-2">
          <div className="relative">
            {isQS ? (
              // Quantum-Safe: Show connected status with creative text
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 px-4 py-2 border-2 border-primary text-primary hover:bg-primary/10 transition-all pixel-text text-sm glitch-hover"
              >
                <Shield className="w-4 h-4" />
                QS_ACTIVE
              </button>
            ) : (
              // Not Quantum-Safe: Show "BECOME_QS" button - opens dropdown
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 px-4 py-2 border-2 border-primary text-primary hover:bg-primary/10 transition-all pixel-text text-sm glitch-hover"
              >
                <Zap className="w-4 h-4" />
                BECOME_QS
              </button>
            )}

            {showDetails && (
              <div className={`absolute right-0 top-full mt-2 border-2 border-primary bg-black p-4 z-50 shadow-lg shadow-primary/20 ${isQS ? 'w-96' : 'w-80'}`}>
                <div className="pixel-text space-y-3">
                  {isQS ? (
                    // Quantum-Safe User View - Wallet Interface
                    <>
                      {/* Wallet Header */}
                      <div className="border-b-2 border-primary/30 pb-3 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-primary font-bold pixel-text text-sm">QUANTUM WALLET</p>
                            <p className="text-foreground/60 text-[10px] pixel-text">Post-Quantum Protected</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary animate-pulse"></div>
                          <p className="text-primary text-xs pixel-text font-bold">KEYS_ACTIVE</p>
                        </div>
                      </div>

                      {/* Quantum Keys Status */}
                      <div className="space-y-3 mb-3">
                        <div className="p-3 bg-primary/5 border border-primary/20">
                          <p className="text-foreground/60 text-[10px] pixel-text mb-1">QUANTUM_KEYS</p>
                          <div className="flex items-center gap-2">
                            <Check className="w-3 h-3 text-primary" />
                            <p className="text-primary text-xs pixel-text font-bold">DILITHIUM-3 INITIALIZED</p>
                          </div>
                        </div>

                        {/* Public Key Hash */}
                        {publicKeyHash && (
                          <div className="p-3 bg-black border border-primary/20">
                            <p className="text-foreground/60 text-[10px] pixel-text mb-2">PUBLIC_KEY_HASH</p>
                            <div className="bg-black/50 p-2 border border-primary/10">
                              <p className="text-primary text-[10px] font-mono break-all pixel-text">
                                {publicKeyHash}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(publicKeyHash);
                              }}
                              className="mt-2 text-[10px] text-primary/80 hover:text-primary pixel-text"
                            >
                              [COPY]
                            </button>
                          </div>
                        )}

                        {/* Account Address */}
                        {accountAddress && (
                          <div className="p-3 bg-black border border-primary/20">
                            <p className="text-foreground/60 text-[10px] pixel-text mb-2">ACCOUNT_ADDRESS</p>
                            <div className="bg-black/50 p-2 border border-primary/10">
                              <p className="text-foreground text-[10px] font-mono break-all pixel-text">
                                {accountAddress}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(accountAddress);
                              }}
                              className="mt-2 text-[10px] text-primary/80 hover:text-primary pixel-text"
                            >
                              [COPY]
                            </button>
                          </div>
                        )}

                        {/* Benefits */}
                        <div className="p-3 bg-primary/5 border border-primary/20">
                          <p className="text-foreground/60 text-[10px] pixel-text mb-2">ACTIVE_BENEFITS</p>
                          <ul className="space-y-1 text-[10px] text-foreground/80 pixel-text">
                            <li className="flex items-center gap-1.5">
                              <div className="w-1 h-1 bg-primary"></div>
                              Quantum-gated pool access
                            </li>
                            <li className="flex items-center gap-1.5">
                              <div className="w-1 h-1 bg-primary"></div>
                              Reduced fees (0.15%)
                            </li>
                            <li className="flex items-center gap-1.5">
                              <div className="w-1 h-1 bg-primary"></div>
                              MEV protection
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-primary/30 space-y-2">
                        <button
                          onClick={() => {
                            disconnectSnap();
                            setShowDetails(false);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 border border-red-500/50 text-red-500 hover:bg-red-500/10 transition-all pixel-text text-[10px]"
                        >
                          <LogOut className="w-2.5 h-2.5" />
                          DISCONNECT_WALLET
                        </button>
                      </div>
                    </>
                  ) : (
                    // Not Quantum-Safe User View
                    <>
                      <div>
                        <p className="text-foreground/60 text-xs mb-1">STATUS</p>
                        <p className="text-red-500 font-bold">⚠️ Not Quantum-Safe</p>
                      </div>

                      <div className="pt-3 border-t border-primary/30 space-y-3">
                        <p className="text-xs text-foreground/60 mb-3">
                          Become quantum-safe to access exclusive features:
                        </p>
                        <ul className="text-xs text-foreground/60 space-y-1 mb-3">
                          <li>• Access quantum-gated pools</li>
                          <li>• Reduced swap fees (0.15% vs 0.40%)</li>
                          <li>• MEV resistance protection</li>
                        </ul>

                        <button
                          onClick={() => {
                            setShowSetupModal(true);
                            setShowDetails(false);
                          }}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-black hover:bg-primary/80 transition-all pixel-text text-xs font-bold"
                        >
                          <Shield className="w-3 h-3" />
                          SETUP_QUANTUM_KEYS
                        </button>

                        <button
                          onClick={() => {
                            disconnectSnap();
                            setShowDetails(false);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-2 py-1 border border-red-500/50 text-red-500 hover:bg-red-500/10 transition-all pixel-text text-[10px]"
                        >
                          <LogOut className="w-2.5 h-2.5" />
                          DISCONNECT
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {checking && (
            <p className="text-xs text-foreground/40 pixel-text">Checking status...</p>
          )}
        </div>

        {/* Quantum Setup Modal */}
        <QuantumSetupModal
          isOpen={showSetupModal}
          onClose={() => setShowSetupModal(false)}
          onRegistrationComplete={() => {
            // Refresh quantum status after registration
            refreshQuantumStatus();
          }}
        />
      </>
    );
  }

  // Not connected - show connect button
  return (
    <>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-black hover:bg-primary/80 transition-all pixel-text text-sm font-bold disabled:opacity-50 glitch-hover"
      >
        {loading ? (
          <>
            <Download className="w-4 h-4 animate-bounce" />
            CONNECTING...
          </>
        ) : (
          <>
            <Shield className="w-4 h-4" />
            CONNECT_QUANTUM_SNAP
          </>
        )}
      </button>

      {/* Quantum Setup Modal */}
      <QuantumSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onRegistrationComplete={() => {
          // Refresh quantum status after registration
          refreshQuantumStatus();
        }}
      />
    </>
  );
}
