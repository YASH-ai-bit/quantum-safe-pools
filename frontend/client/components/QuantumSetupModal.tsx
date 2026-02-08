import { useState, useEffect } from 'react';
import { useSnap } from '../hooks/useSnap';
import { useQuantumRegistry } from '../hooks/useQuantumRegistry';
import { Shield, Key, CheckCircle, Loader2, AlertTriangle, X } from 'lucide-react';

interface QuantumSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistrationComplete?: () => void;
}

type Step = 'generate' | 'register' | 'complete' | 'error';

export default function QuantumSetupModal({ isOpen, onClose, onRegistrationComplete }: QuantumSetupModalProps) {
  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        // Restore scroll position
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);
  const { publicKey, publicKeyHash, refreshData } = useSnap();
  const { register, isLoading, error: registryError } = useQuantumRegistry();

  const [step, setStep] = useState<Step>('generate');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Check if keys already exist
      if (publicKey && publicKeyHash) {
        setStep('register');
      } else {
        setStep('generate');
      }
    }
  }, [isOpen, publicKey, publicKeyHash]);

  const handleGenerateKeys = async () => {
    setError(null);
    try {
      // Keys are auto-generated when snap connects
      await refreshData();
      setStep('register');
    } catch (err: any) {
      setError(err.message || 'Failed to generate keys');
      setStep('error');
    }
  };

  const handleRegister = async () => {
    if (!publicKeyHash) {
      setError('No public key hash found');
      setStep('error');
      return;
    }

    setError(null);
    try {
      const hash = await register(publicKeyHash);
      setTxHash(hash);
      setStep('complete');
      // Notify parent that registration is complete
      if (onRegistrationComplete) {
        onRegistrationComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to register');
      setStep('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl border-2 border-primary bg-black p-8 shadow-2xl shadow-primary/20">
        {/* Close button - always visible */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-foreground/60 hover:text-primary transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="mb-8 border-b-2 border-primary pb-4">
          <h2 className="pixel-text text-2xl font-bold text-primary flex items-center gap-3">
            <Shield className="w-8 h-8" />
            QUANTUM_SAFE_SETUP
          </h2>
          <p className="pixel-text text-sm text-foreground/60 mt-2">
            Post-Quantum Cryptography Initialization
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Step 1: Generate Keys */}
          {step === 'generate' && (
            <div className="space-y-6">
              <div className="border-2 border-primary/30 p-6">
                <div className="flex items-start gap-4">
                  <Key className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="pixel-text text-lg font-bold text-primary mb-2">
                      STEP_1: GENERATE_DILITHIUM_KEYS
                    </h3>
                    <p className="pixel-text text-sm text-foreground/80 mb-4">
                      Your quantum-resistant keypair will be generated using Dilithium-2
                      algorithm and stored securely in MetaMask Snap.
                    </p>
                    <ul className="pixel-text text-xs text-foreground/60 space-y-2 mb-6">
                      <li>• NIST Post-Quantum Cryptography Standard</li>
                      <li>• Secure enclave storage</li>
                      <li>• No private key exposure</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerateKeys}
                className="w-full bg-primary text-black py-4 pixel-text font-bold text-lg hover:bg-primary/80 transition-all flex items-center justify-center gap-3"
              >
                <Key className="w-5 h-5" />
                GENERATE_QUANTUM_KEYS
              </button>
            </div>
          )}

          {/* Step 2: Register */}
          {step === 'register' && (
            <div className="space-y-6">
              <div className="border-2 border-primary/30 p-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="pixel-text text-lg font-bold text-primary mb-2">
                      STEP_2: REGISTER_ON_CHAIN
                    </h3>
                    <p className="pixel-text text-sm text-foreground/80 mb-4">
                      Register your public key hash to the QuantumRegistry contract on Sepolia.
                    </p>

                    {publicKeyHash && (
                      <div className="mb-4 p-3 bg-primary/10 border border-primary/30">
                        <p className="pixel-text text-xs text-foreground/60 mb-1">PUBLIC_KEY_HASH:</p>
                        <p className="pixel-text text-xs text-primary font-mono break-all">
                          {publicKeyHash}
                        </p>
                      </div>
                    )}

                    <ul className="pixel-text text-xs text-foreground/60 space-y-2">
                      <li>• On-chain identity verification</li>
                      <li>• Enables quantum-safe pool access</li>
                      <li>• Lower swap fees (0.15% vs 0.30%)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {registryError && (
                <div className="border-2 border-red-500 bg-red-500/10 p-4">
                  <p className="pixel-text text-sm text-red-500">{registryError}</p>
                </div>
              )}

              <button
                onClick={handleRegister}
                disabled={isLoading}
                className="w-full bg-primary text-black py-4 pixel-text font-bold text-lg hover:bg-primary/80 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    REGISTERING...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    REGISTER_QUANTUM_IDENTITY
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 3: Complete */}
          {step === 'complete' && (
            <div className="space-y-6">
              <div className="border-2 border-primary p-8 text-center">
                <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                <h3 className="pixel-text text-2xl font-bold text-primary mb-2">
                  QUANTUM_SAFE_ACTIVATED
                </h3>
                <p className="pixel-text text-sm text-foreground/80 mb-6">
                  You are now protected by post-quantum cryptography!
                </p>

                {txHash && (
                  <div className="mb-6 p-4 bg-primary/10 border border-primary/30">
                    <p className="pixel-text text-xs text-foreground/60 mb-2">TRANSACTION:</p>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pixel-text text-xs text-primary font-mono break-all hover:underline"
                    >
                      {txHash}
                    </a>
                  </div>
                )}

                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary"></div>
                    <p className="pixel-text text-sm text-foreground/80">Access to quantum-gated pools</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary"></div>
                    <p className="pixel-text text-sm text-foreground/80">Reduced swap fees (0.15%)</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary"></div>
                    <p className="pixel-text text-sm text-foreground/80">MEV resistance protection</p>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-primary text-black py-4 pixel-text font-bold text-lg hover:bg-primary/80 transition-all"
              >
                CONTINUE_TO_DASHBOARD
              </button>
            </div>
          )}

          {/* Error State */}
          {step === 'error' && (
            <div className="space-y-6">
              <div className="border-2 border-red-500 p-8 text-center">
                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="pixel-text text-2xl font-bold text-red-500 mb-2">
                  ERROR_OCCURRED
                </h3>
                <p className="pixel-text text-sm text-foreground/80 mb-4">
                  {error || 'An unknown error occurred'}
                </p>
              </div>

              <button
                onClick={() => setStep(publicKeyHash ? 'register' : 'generate')}
                className="w-full border-2 border-primary text-primary py-4 pixel-text font-bold text-lg hover:bg-primary/10 transition-all"
              >
                TRY_AGAIN
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
