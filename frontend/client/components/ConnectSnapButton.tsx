import { useState } from 'react';
import { Shield, Download, Check, AlertCircle } from 'lucide-react';
import { useSnap } from '../hooks/useSnap';

export default function ConnectSnapButton() {
  const { isFlask, isConnected, publicKeyHash, loading, error, connectSnap } = useSnap();
  const [showDetails, setShowDetails] = useState(false);

  // Debug logging
  console.log('ConnectSnapButton state:', { isFlask, isConnected, loading, error });

  const handleConnect = async () => {
    await connectSnap();
  };

  // Not Flask - show warning
  if (!isFlask) {
    return (
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
    );
  }

  // Connected - show status
  if (isConnected) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 px-4 py-2 border-2 border-primary text-primary hover:bg-primary/10 transition-all pixel-text text-sm glitch-hover"
        >
          <Check className="w-4 h-4" />
          QUANTUM_CONNECTED
        </button>

        {showDetails && (
          <div className="absolute right-0 top-full mt-2 w-80 border-2 border-primary bg-black p-4 z-50 shadow-lg shadow-primary/20">
            <div className="pixel-text space-y-3">
              <div>
                <p className="text-foreground/60 text-xs mb-1">STATUS</p>
                <p className="text-primary font-bold">✅ Quantum-Safe Active</p>
              </div>
              
              {publicKeyHash && (
                <div>
                  <p className="text-foreground/60 text-xs mb-1">PUBLIC_KEY_HASH</p>
                  <p className="text-foreground text-xs font-mono break-all">
                    {publicKeyHash.slice(0, 20)}...
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-primary/30">
                <p className="text-xs text-foreground/60">
                  Your quantum keys are secure in MetaMask Snap
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Not connected - show connect button
  return (
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
  );
}
